import nodemailer from 'nodemailer';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Setup secure live Gmail SMTP transporter (highly configurable via env variables for production hosting)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE !== 'false', // defaults to true, set to 'false' if using Port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000, // 10 seconds connection timeout
  greetingTimeout: 10000,
  socketTimeout: 10000
});

const app = express();
const port = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretactivationkey2026!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'evenmoresecretrefreshkey2026!';

app.use(cors());
app.use(express.json());

// Log HTTP requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 12 fixed steps matching the tracking spreadsheet
const STEP_NAMES = [
  "Inward",
  "Segregation",
  "Programming",
  "1st Testing",
  "Debug",
  "Entry",
  "Cleaning",
  "QC After Cleaning",
  "Marking & Coating",
  "Final Testing",
  "Packing",
  "Final Entry"
];

// ==========================================
// Authentication & Authorization Middlewares
// ==========================================

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ error: "Access token is invalid or expired." });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Authorization header is missing." });
  }
};

const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// ==========================================
// Authentication & Session Endpoints
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email.trim().toLowerCase()]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Sign Access & Refresh tokens
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save active refresh token in database
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server authentication error." });
  }
});

// POST /api/auth/refresh
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Refresh token is invalid or expired." });
      }

      const userRes = await query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2 AND is_active = TRUE', [decoded.id, refreshToken]);
      if (userRes.rowCount === 0) {
        return res.status(401).json({ error: "Session has been invalidated or rotated." });
      }

      const user = userRes.rows[0];

      // Rotate tokens
      const newAccessToken = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Save rotated refresh token in database
      await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefreshToken, user.id]);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: "Server session renewal error." });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateJWT, async (req, res) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: "Server session termination error." });
  }
});

// ==========================================
// Core Refurbishment API Routes (Protected)
// ==========================================

// 1. GET /api/dashboard - Cumulative analytics and bottlenecks (Superadmin, Manager, Team Lead)
app.get('/api/dashboard', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_no } = req.query;

  try {
    // Cumulative metrics
    let lotsQuery = 'SELECT * FROM lots';
    let lotsParams = [];
    if (lot_no) {
      lotsQuery += ' WHERE lot_no = $1';
      lotsParams.push(lot_no);
    }
    const lotsRes = await query(lotsQuery, lotsParams);

    let totalLots = lotsRes.rowCount;
    let totalReceived = 0;
    let totalDispatched = 0;
    let totalAvailable = 0;
    let totalPending = 0;

    // Calculate totals
    for (const lot of lotsRes.rows) {
      totalReceived += lot.received_qty;

      // Calculate dispatched for this lot
      const dispRes = await query(
        "SELECT COUNT(*) FROM panels WHERE lot_id = $1 AND current_step = 12 AND status != 'Scrap'",
        [lot.id]
      );
      const dispCount = parseInt(dispRes.rows[0].count);
      totalDispatched += dispCount;

      // Calculate scrap for this lot
      const scrapRes = await query(
        "SELECT COUNT(*) FROM panels WHERE lot_id = $1 AND status = 'Scrap'",
        [lot.id]
      );
      const scrapCount = parseInt(scrapRes.rows[0].count);

      totalAvailable += (lot.received_qty - dispCount - scrapCount);
    }

    const stepBreakdown = [];
    let bottleneckAlerts = [];

    for (let i = 1; i <= 12; i++) {
      let countQuery = "SELECT COUNT(*) FROM panels WHERE current_step = $1 AND status != 'Scrap'";
      let countParams = [i];
      if (lot_no) {
        countQuery += " AND lot_id = (SELECT id FROM lots WHERE lot_no = $2)";
        countParams.push(lot_no);
      }

      const countRes = await query(countQuery, countParams);
      const countVal = parseInt(countRes.rows[0].count);

      stepBreakdown.push({
        step_no: i,
        step_name: STEP_NAMES[i - 1],
        count: countVal
      });

      // Bottleneck alert if > 10 panels are clogging a step
      if (i !== 12 && countVal > 10) {
        bottleneckAlerts.push({
          type: "bottleneck",
          step_no: i,
          step_name: STEP_NAMES[i - 1],
          count: countVal,
          message: `Bottleneck detected at Step ${i} (${STEP_NAMES[i - 1]}): ${countVal} panels pending.`
        });
      }
    }

    totalPending = stepBreakdown.reduce((sum, item) => sum + (item.step_no !== 12 ? item.count : 0), 0);

    // Client discrepancy alerts
    for (const lot of lotsRes.rows) {
      const shortage = lot.qty_sent - lot.received_qty;
      if (shortage > 10) {
        bottleneckAlerts.push({
          type: "discrepancy",
          lot_no: lot.lot_no,
          message: `Shortage discrepancy detected on Lot ${lot.lot_no}: Client sent ${lot.qty_sent} vs ${lot.received_qty} received (${shortage} missing).`
        });
      }
    }

    // Daily activity trend (using panel_logs with userContext to support RLS automatically)
    const trendRes = await query(`
      SELECT 
        DATE(a.timestamp) as date,
        s.name as step_name,
        COUNT(*) as count
      FROM panel_logs a
      JOIN repair_steps s ON a.step_id = s.id
      GROUP BY DATE(a.timestamp), s.name
      ORDER BY DATE(a.timestamp) DESC, count DESC
      LIMIT 30
    `, [], req.user);

    res.json({
      metrics: {
        total_lots: totalLots,
        total_received: totalReceived,
        total_dispatched: totalDispatched,
        total_available: totalAvailable,
        total_pending: totalPending
      },
      pipeline: stepBreakdown,
      alerts: bottleneckAlerts,
      trend: trendRes.rows
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: "Failed to load dashboard data." });
  }
});

// 2. GET /api/stock - Fetch stock summary and lots with server-side filters (All authenticated users)
app.get('/api/stock', authenticateJWT, async (req, res) => {
  const { client_id, status, search, start_date, end_date } = req.query;

  try {
    let queryText = 'SELECT * FROM lots';
    const params = [];
    const conditions = [];

    if (client_id) {
      params.push(client_id);
      conditions.push(`client_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(CAST(lot_no AS VARCHAR) LIKE $${params.length} OR batch_no ILIKE $${params.length})`);
    }

    if (start_date) {
      params.push(start_date);
      conditions.push(`received_date >= $${params.length}`);
    }

    if (end_date) {
      params.push(end_date);
      conditions.push(`received_date <= $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY lot_no DESC';

    const lotsRes = await query(queryText, params);
    const lotsSummary = [];

    for (const lot of lotsRes.rows) {
      const available = (lot.received_qty || 0) - (lot.dispatched_qty || 0) + (lot.return_qty || 0) - (lot.redispatch_qty || 0);

      // Retrieve client name
      const clientRes = await query("SELECT name FROM clients WHERE id = $1", [lot.client_id]);
      const clientName = clientRes.rowCount > 0 ? clientRes.rows[0].name : "Unknown";

      lotsSummary.push({
        ...lot,
        client_name: clientName,
        available
      });
    }

    res.json(lotsSummary);
  } catch (err) {
    console.error('Stock error:', err);
    res.status(500).json({ error: "Failed to load stock data." });
  }
});

// Helper: Fetch clients list for filters (All authenticated users)
app.get('/api/stock/clients', authenticateJWT, async (req, res) => {
  try {
    const clientsRes = await query('SELECT * FROM clients ORDER BY name ASC');
    res.json(clientsRes.rows);
  } catch (err) {
    console.error('Clients fetch error:', err);
    res.status(500).json({ error: "Failed to fetch clients." });
  }
});

// 3. POST /api/stock/inward - Ship lot inwards (Superadmin, Manager, Team Lead)
app.post('/api/stock/inward', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_no, batch_no, pixel_pitch, client_name, qty_sent, qty_received, remarks } = req.body;

  if (!lot_no || !batch_no || !pixel_pitch || !client_name || qty_sent === undefined || qty_received === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkExist = await client.query('SELECT id FROM lots WHERE lot_no = $1', [lot_no]);
    if (checkExist.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Lot number ${lot_no} already exists.` });
    }

    // Insert client if not exists
    let clientRes = await client.query('SELECT id FROM clients WHERE name = $1', [client_name]);
    let clientId;
    if (clientRes.rowCount === 0) {
      const insClient = await client.query('INSERT INTO clients (name) VALUES ($1) RETURNING id', [client_name]);
      clientId = insClient.rows[0].id;
    } else {
      clientId = clientRes.rows[0].id;
    }

    const insertRes = await client.query(`
      INSERT INTO lots (lot_no, batch_no, pixel_pitch, client_id, qty_sent, received_qty, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [lot_no, batch_no, pixel_pitch, clientId, qty_sent, qty_received, remarks]);

    const newLot = insertRes.rows[0];

    // Log the Inward transaction
    await client.query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, qty, actor_id, remarks)
      VALUES ($1, 'Inward', $2, $3, $4)
    `, [newLot.id, qty_received, req.user.id, remarks || 'Initial inward lot entry']);

    // Check if auto-complete condition is met (if available is 0, e.g. received_qty is 0)
    const available = (newLot.received_qty || 0) - (newLot.dispatched_qty || 0) + (newLot.return_qty || 0) - (newLot.redispatch_qty || 0);
    if (available === 0) {
      await client.query("UPDATE lots SET status = 'Complete' WHERE id = $1", [newLot.id]);
      await client.query(`
        INSERT INTO lot_transactions (lot_id, transaction_type, actor_id, remarks)
        VALUES ($1, 'Status Toggle', $2, 'System auto-completed lot (Available quantity reached 0)')
      `, [newLot.id, req.user.id]);
      newLot.status = 'Complete';
    }

    await client.query('COMMIT');
    res.status(201).json({ ...newLot, client_name, available });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Inward error:', err);
    res.status(500).json({ error: "Failed to record inward shipment." });
  } finally {
    client.release();
  }
});

// Helper function to handle status updates when Available reaches 0
async function checkAndAutoSetComplete(client, lotId, actorId) {
  const lotRes = await client.query('SELECT * FROM lots WHERE id = $1', [lotId]);
  const lot = lotRes.rows[0];
  const available = (lot.received_qty || 0) - (lot.dispatched_qty || 0) + (lot.return_qty || 0) - (lot.redispatch_qty || 0);

  if (available === 0 && lot.status !== 'Complete') {
    await client.query("UPDATE lots SET status = 'Complete' WHERE id = $1", [lotId]);
    await client.query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, actor_id, remarks)
      VALUES ($1, 'Status Toggle', $2, 'System auto-completed lot (Available quantity reached 0)')
    `, [lotId, actorId]);
    return 'Complete';
  }
  return lot.status;
}

// Helper function to check Complete state lock
async function checkCompleteLock(client, lotId, userRole) {
  const lotRes = await client.query('SELECT status FROM lots WHERE id = $1', [lotId]);
  if (lotRes.rowCount === 0) return false;
  if (lotRes.rows[0].status === 'Complete' && userRole !== 'Superadmin') {
    return true; // Locked
  }
  return false; // Not locked (or superadmin bypass)
}

// POST /api/stock/outward - Record outward dispatch (Superadmin, Manager, Team Lead)
app.post('/api/stock/outward', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_id, qty, remarks } = req.body;
  if (!lot_id || qty === undefined || qty <= 0) {
    return res.status(400).json({ error: "Valid lot_id and positive quantity are required." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock check
    const isLocked = await checkCompleteLock(client, lot_id, req.user.role);
    if (isLocked) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access denied. This lot is completed and locked. Only a Superadmin can perform transactions." });
    }

    const lotRes = await client.query('SELECT * FROM lots WHERE id = $1', [lot_id]);
    if (lotRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Lot not found." });
    }
    const lot = lotRes.rows[0];
    const available = (lot.received_qty || 0) - (lot.dispatched_qty || 0) + (lot.return_qty || 0) - (lot.redispatch_qty || 0);

    // 2. Stock check
    if (qty > available) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient stock available. Requested: ${qty}, Available: ${available}` });
    }

    // 3. Update outward
    const updateRes = await client.query(`
      UPDATE lots 
      SET dispatched_qty = dispatched_qty + $1 
      WHERE id = $2 
      RETURNING *
    `, [qty, lot_id]);

    const updatedLot = updateRes.rows[0];

    // 4. Log transaction
    await client.query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, qty, actor_id, remarks)
      VALUES ($1, 'Outward', $2, $3, $4)
    `, [lot_id, qty, req.user.id, remarks || 'Outward shipment recorded']);

    // 5. Auto-complete check
    const nextStatus = await checkAndAutoSetComplete(client, lot_id, req.user.id);
    updatedLot.status = nextStatus;

    await client.query('COMMIT');

    const finalAvailable = (updatedLot.received_qty || 0) - (updatedLot.dispatched_qty || 0) + (updatedLot.return_qty || 0) - (updatedLot.redispatch_qty || 0);
    res.json({ ...updatedLot, available: finalAvailable });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Outward error:', err);
    res.status(500).json({ error: "Failed to record outward shipment." });
  } finally {
    client.release();
  }
});

// POST /api/stock/return - Record customer return (Superadmin, Manager, Team Lead)
app.post('/api/stock/return', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_id, qty, reason, remarks } = req.body;
  if (!lot_id || qty === undefined || qty <= 0) {
    return res.status(400).json({ error: "Valid lot_id and positive quantity are required." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock check
    const isLocked = await checkCompleteLock(client, lot_id, req.user.role);
    if (isLocked) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access denied. This lot is completed and locked. Only a Superadmin can perform transactions." });
    }

    // 2. Update return
    const updateRes = await client.query(`
      UPDATE lots 
      SET return_qty = return_qty + $1 
      WHERE id = $2 
      RETURNING *
    `, [qty, lot_id]);

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Lot not found." });
    }

    const updatedLot = updateRes.rows[0];

    // 3. Log transaction
    const logRemarks = `Reason: ${reason || 'Not specified'}. ${remarks || ''}`.trim();
    await client.query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, qty, actor_id, remarks)
      VALUES ($1, 'Return', $2, $3, $4)
    `, [lot_id, qty, req.user.id, logRemarks]);

    // 4. Auto-complete check
    const nextStatus = await checkAndAutoSetComplete(client, lot_id, req.user.id);
    updatedLot.status = nextStatus;

    await client.query('COMMIT');

    const finalAvailable = (updatedLot.received_qty || 0) - (updatedLot.dispatched_qty || 0) + (updatedLot.return_qty || 0) - (updatedLot.redispatch_qty || 0);
    res.json({ ...updatedLot, available: finalAvailable });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Return error:', err);
    res.status(500).json({ error: "Failed to record returned stock." });
  } finally {
    client.release();
  }
});

// POST /api/stock/redispatch - Record returned lot redispatch (Superadmin, Manager, Team Lead)
app.post('/api/stock/redispatch', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_id, qty, remarks } = req.body;
  if (!lot_id || qty === undefined || qty <= 0) {
    return res.status(400).json({ error: "Valid lot_id and positive quantity are required." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock check
    const isLocked = await checkCompleteLock(client, lot_id, req.user.role);
    if (isLocked) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access denied. This lot is completed and locked. Only a Superadmin can perform transactions." });
    }

    const lotRes = await client.query('SELECT * FROM lots WHERE id = $1', [lot_id]);
    if (lotRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Lot not found." });
    }
    const lot = lotRes.rows[0];
    const available = (lot.received_qty || 0) - (lot.dispatched_qty || 0) + (lot.return_qty || 0) - (lot.redispatch_qty || 0);

    // 2. Stock check
    if (qty > available) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient stock available. Requested: ${qty}, Available: ${available}` });
    }

    // 3. Update redispatch
    const updateRes = await client.query(`
      UPDATE lots 
      SET redispatch_qty = redispatch_qty + $1 
      WHERE id = $2 
      RETURNING *
    `, [qty, lot_id]);

    const updatedLot = updateRes.rows[0];

    // 4. Log transaction
    await client.query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, qty, actor_id, remarks)
      VALUES ($1, 'Redispatch', $2, $3, $4)
    `, [lot_id, qty, req.user.id, remarks || 'Returned lot redispatch recorded']);

    // 5. Auto-complete check
    const nextStatus = await checkAndAutoSetComplete(client, lot_id, req.user.id);
    updatedLot.status = nextStatus;

    await client.query('COMMIT');

    const finalAvailable = (updatedLot.received_qty || 0) - (updatedLot.dispatched_qty || 0) + (updatedLot.return_qty || 0) - (updatedLot.redispatch_qty || 0);
    res.json({ ...updatedLot, available: finalAvailable });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Redispatch error:', err);
    res.status(500).json({ error: "Failed to record lot redispatch." });
  } finally {
    client.release();
  }
});

// GET /api/stock/transactions/:id - Fetch transaction history logs for a specific lot (All authenticated users)
app.get('/api/stock/transactions/:id', authenticateJWT, async (req, res) => {
  try {
    const transRes = await query(`
      SELECT t.*, u.name as actor_name 
      FROM lot_transactions t
      LEFT JOIN users u ON t.actor_id = u.id
      WHERE t.lot_id = $1
      ORDER BY t.created_at DESC
    `, [req.params.id]);
    res.json(transRes.rows);
  } catch (err) {
    console.error('Lot transactions fetch error:', err);
    res.status(500).json({ error: "Failed to load lot transactions history." });
  }
});

// 4. GET /api/engineers - Fetch worker profiles (All authenticated users)
app.get('/api/engineers', authenticateJWT, async (req, res) => {
  try {
    // Return all Employees / Engineers for assignment dropdowns
    const engRes = await query("SELECT id, name, role, attendance_rate, avatar FROM users WHERE role = 'Employee' ORDER BY name ASC");
    res.json(engRes.rows);
  } catch (err) {
    console.error('Engineers list error:', err);
    res.status(500).json({ error: "Failed to fetch engineer profiles." });
  }
});

// 5. GET /api/leaderboard - Performer gamified stats using exact Phase 5 formula (All authenticated users)
app.get('/api/leaderboard', authenticateJWT, async (req, res) => {
  try {
    const engRes = await query("SELECT id, name, role, attendance_rate, avatar FROM users WHERE role = 'Employee'");
    const scores = [];

    for (const eng of engRes.rows) {
      // 1. PCBs Repaired (Step 12 complete)
      const repRes = await query(`
        SELECT COUNT(DISTINCT panel_id) FROM panel_logs 
        WHERE engineer_id = $1 AND step_id = (SELECT id FROM repair_steps WHERE step_no = 12)
      `, [eng.id]);
      const pcbsRepaired = parseInt(repRes.rows[0].count);
      const pcbRepairedPoints = Math.min((pcbsRepaired / 15) * 100, 100);

      // 2. First-pass Yield
      const qualRes = await query(`
        SELECT 
          COUNT(CASE WHEN status = 'Faulty' THEN 1 END) as faulty_count,
          COUNT(*) as total_count
        FROM panel_logs
        WHERE engineer_id = $1
      `, [eng.id]);

      const faultyCount = parseInt(qualRes.rows[0].faulty_count || 0);
      const totalCount = parseInt(qualRes.rows[0].total_count || 0);
      const firstPassYield = totalCount > 0 ? ((totalCount - faultyCount) / totalCount) * 100 : 100.0;

      // 3. Speed Score
      const speedRes = await query(`
        SELECT COUNT(*) FROM panel_logs 
        WHERE engineer_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'
      `, [eng.id]);
      const speedCount = parseInt(speedRes.rows[0].count);
      const speedScorePoints = Math.min((speedCount / 40) * 100, 100);

      // 4. Attendance rate
      const attendancePct = parseFloat(eng.attendance_rate || 95.0);

      // Composite Score: (PCBs Repaired × 35%) + (First-pass Yield × 30%) + (Speed Score × 20%) + (Attendance × 15%)
      const overallScore = Math.round(
        (pcbRepairedPoints * 0.35) +
        (firstPassYield * 0.30) +
        (speedScorePoints * 0.20) +
        (attendancePct * 0.15)
      );

      scores.push({
        id: eng.id,
        name: eng.name,
        avatar: eng.avatar,
        speed: speedCount,
        quality: Math.round(firstPassYield),
        attendance: eng.attendance_rate,
        score: overallScore
      });
    }

    scores.sort((a, b) => b.score - a.score);
    res.json(scores);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: "Failed to calculate leaderboard." });
  }
});

// 5b. GET /api/panels - Fetch active panels filtered by step (All authenticated users - with RLS context)
app.get('/api/panels', authenticateJWT, async (req, res) => {
  const { step_no } = req.query;

  try {
    let panelRes;
    if (step_no) {
      panelRes = await query(`
        SELECT p.*, l.lot_no, l.batch_no, l.pixel_pitch, e.name as engineer_name 
        FROM panels p
        JOIN lots l ON p.lot_id = l.id
        LEFT JOIN users e ON p.assigned_engineer_id = e.id
        WHERE p.current_step = $1 AND p.status != 'Scrap'
        ORDER BY l.lot_no ASC, p.sr_no ASC
      `, [parseInt(step_no)], req.user);
    } else {
      panelRes = await query(`
        SELECT p.*, l.lot_no, l.batch_no, l.pixel_pitch, e.name as engineer_name 
        FROM panels p
        JOIN lots l ON p.lot_id = l.id
        LEFT JOIN users e ON p.assigned_engineer_id = e.id
        WHERE p.status != 'Scrap'
        ORDER BY l.lot_no ASC, p.sr_no ASC
      `, [], req.user);
    }

    res.json(panelRes.rows);
  } catch (err) {
    console.error('Fetch panels error:', err);
    res.status(500).json({ error: "Failed to fetch panels." });
  }
});

// 6. GET /api/panels/search - Query panel state & filtered audit log (All authenticated users - with RLS context)
app.get('/api/panels/search', authenticateJWT, async (req, res) => {
  const { barcode, sr_no, lot_no } = req.query;

  try {
    let panelRes;
    if (barcode) {
      panelRes = await query(`
        SELECT p.*, l.lot_no, l.batch_no, l.pixel_pitch, e.name as engineer_name 
        FROM panels p
        JOIN lots l ON p.lot_id = l.id
        LEFT JOIN users e ON p.assigned_engineer_id = e.id
        WHERE p.barcode = $1
      `, [barcode.trim()]);
    } else if (sr_no && lot_no) {
      panelRes = await query(`
        SELECT p.*, l.lot_no, l.batch_no, l.pixel_pitch, e.name as engineer_name
        FROM panels p
        JOIN lots l ON p.lot_id = l.id
        LEFT JOIN users e ON p.assigned_engineer_id = e.id
        WHERE p.sr_no = $1 AND l.lot_no = $2
      `, [sr_no, lot_no]);
    } else {
      return res.status(400).json({ error: "Please provide a barcode or a Serial Number + Lot Number." });
    }

    if (panelRes.rowCount === 0) {
      return res.status(404).json({ error: "Panel not found." });
    }

    const panel = panelRes.rows[0];

    // Fetch activity audit log - Passing req.user context to enforce RLS
    const actRes = await query(`
      SELECT a.*, s.name as step_name, e.name as engineer_name 
      FROM panel_logs a
      JOIN repair_steps s ON a.step_id = s.id
      LEFT JOIN users e ON a.engineer_id = e.id
      WHERE a.panel_id = $1
      ORDER BY s.step_no ASC, a.timestamp ASC
    `, [panel.id], req.user);

    // Dynamic Panel Locking check: Check if there is an active pending approval entry in pending_logs
    const pendingRes = await query(`
      SELECT pl.*, u.name as engineer_name 
      FROM pending_logs pl
      JOIN users u ON pl.engineer_id = u.id
      WHERE pl.panel_id = $1 AND pl.approval_status IN ('Pending Team Lead', 'Pending Manager', 'Rejected')
      ORDER BY pl.id DESC LIMIT 1
    `, [panel.id], req.user);

    let isLocked = false;
    let pendingInfo = null;
    let reworkInfo = null;

    if (pendingRes.rowCount > 0) {
      const pLog = pendingRes.rows[0];
      if (pLog.approval_status === 'Rejected') {
        reworkInfo = {
          rejection_reason: pLog.rejection_reason,
          step_no: pLog.step_no,
          step_name: STEP_NAMES[pLog.step_no - 1]
        };
      } else {
        isLocked = true;
        pendingInfo = {
          id: pLog.id,
          step_no: pLog.step_no,
          step_name: STEP_NAMES[pLog.step_no - 1],
          approval_status: pLog.approval_status,
          engineer_name: pLog.engineer_name
        };
      }
    }

    res.json({
      panel,
      activities: actRes.rows,
      is_locked: isLocked,
      pending_info: pendingInfo,
      rework_info: reworkInfo
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: "Failed to search panel." });
  }
});

// 7. POST /api/repair/assign - Step 1: Assign and auto-generate barcode (Superadmin, Manager, Team Lead)
app.post('/api/repair/assign', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_no, sr_no, side, engineer_id } = req.body;

  if (!lot_no || !sr_no || !side || !engineer_id) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const lotRes = await query('SELECT * FROM lots WHERE lot_no = $1', [lot_no]);
    if (lotRes.rowCount === 0) {
      return res.status(404).json({ error: `Lot number ${lot_no} does not exist.` });
    }
    const lot = lotRes.rows[0];

    // Barcode generation formula
    const pitchStr = lot.pixel_pitch.replace('.', '');
    const sideChar = side[0];
    const srStr = String(sr_no).padStart(4, '0');
    const barcode = `ESRP2${pitchStr}${lot.lot_no}E26${lot.batch_no}${sideChar}${srStr}`;

    // Validate barcode/serial availability
    const checkBarcode = await query('SELECT id FROM panels WHERE barcode = $1', [barcode]);
    if (checkBarcode.rowCount > 0) {
      return res.status(400).json({ error: `Barcode ${barcode} already exists.` });
    }

    const checkSerial = await query('SELECT id FROM panels WHERE lot_id = $1 AND sr_no = $2', [lot.id, sr_no]);
    if (checkSerial.rowCount > 0) {
      return res.status(400).json({ error: `Serial number ${sr_no} has already been registered in Lot ${lot_no}.` });
    }

    // Insert new panel
    const insertRes = await query(`
      INSERT INTO panels (lot_id, sr_no, side, barcode, status, current_step, assigned_engineer_id)
      VALUES ($1, $2, $3, $4, 'Repairable', 1, $5)
      RETURNING *
    `, [lot.id, sr_no, side, barcode, engineer_id]);

    const newPanel = insertRes.rows[0];

    // Log Step 1 Activity
    await query(`
      INSERT INTO panel_logs (panel_id, step_id, engineer_id, status, remark)
      VALUES ($1, (SELECT id FROM repair_steps WHERE step_no = 1), $2, 'OK', 'Initial registration and panel assignment')
    `, [newPanel.id, engineer_id]);

    res.status(201).json({ panel: newPanel, barcode });

  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ error: "Failed to register panel." });
  }
});

// 8. POST /api/repair/next - Progress step (All authenticated users - RLS context verified)
app.post('/api/repair/next', authenticateJWT, async (req, res) => {
  const { panel_id, engineer_id, status, remark } = req.body;

  if (!panel_id || !engineer_id || !status) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const panelRes = await query('SELECT * FROM panels WHERE id = $1', [panel_id]);
    if (panelRes.rowCount === 0) {
      return res.status(404).json({ error: "Panel not found." });
    }
    const panel = panelRes.rows[0];

    if (panel.status === 'Scrap') {
      return res.status(400).json({ error: "Cannot process a scrapped panel." });
    }
    if (panel.current_step === 12) {
      return res.status(400).json({ error: "Panel is already fully dispatched." });
    }

    // Check if there is already an active pending approval entry
    const checkPending = await query(`
      SELECT id FROM pending_logs 
      WHERE panel_id = $1 AND approval_status IN ('Pending Team Lead', 'Pending Manager')
    `, [panel_id]);
    if (checkPending.rowCount > 0) {
      return res.status(400).json({ error: "This panel already has a pending clearance approval." });
    }

    // RBAC and RLS logic check: Employees can only progress panels assigned to them
    if (req.user.role === 'Employee' && panel.assigned_engineer_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only update panels assigned to you." });
    }

    const currentStepNo = panel.current_step;

    // 2-Tier Quality Clearance Workflow: Employee entries go to pending_logs (temp db)
    if (req.user.role === 'Employee') {
      await query(`
        INSERT INTO pending_logs (panel_id, step_no, engineer_id, status, remark, approval_status)
        VALUES ($1, $2, $3, $4, $5, 'Pending Team Lead')
      `, [panel_id, currentStepNo, req.user.id, status, remark || ''], req.user);

      return res.json({
        success: true,
        pending: true,
        message: "Work logged successfully. Awaiting Team Lead & Manager clearance approvals."
      });
    }

    // Admins, Managers, and Team Leads bypass approvals when logging directly
    let nextStepNo = currentStepNo;
    let nextStatus = panel.status;
    let scrapReason = panel.scrap_reason;

    if (status === 'Scrap') {
      nextStatus = 'Scrap';
      scrapReason = remark || 'Scrapped during repair';

      await query(`
        UPDATE panels 
        SET status = $1, scrap_reason = $2, assigned_engineer_id = $3, updated_at = NOW()
        WHERE id = $4
      `, [nextStatus, scrapReason, engineer_id, panel_id]);

      await query(`
        INSERT INTO panel_logs (panel_id, step_id, engineer_id, status, remark)
        VALUES ($1, (SELECT id FROM repair_steps WHERE step_no = $2), $3, 'Scrap', $4)
      `, [panel_id, currentStepNo, engineer_id, scrapReason], req.user);

    } else if (status === 'Faulty') {
      await query(`
        UPDATE panels 
        SET assigned_engineer_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [engineer_id, panel_id]);

      await query(`
        INSERT INTO panel_logs (panel_id, step_id, engineer_id, status, remark)
        VALUES ($1, (SELECT id FROM repair_steps WHERE step_no = $2), $3, 'Faulty', $4)
      `, [panel_id, currentStepNo, engineer_id, remark || 'Failed test, sent for rework'], req.user);

    } else if (status === 'OK') {
      nextStepNo = currentStepNo + 1;

      await query(`
        UPDATE panels 
        SET current_step = $1, assigned_engineer_id = $2, updated_at = NOW()
        WHERE id = $3
      `, [nextStepNo, engineer_id, panel_id]);

      await query(`
        INSERT INTO panel_logs (panel_id, step_id, engineer_id, status, remark)
        VALUES ($1, (SELECT id FROM repair_steps WHERE step_no = $2), $3, 'OK', $4)
      `, [panel_id, currentStepNo, engineer_id, remark || `Successfully completed step ${STEP_NAMES[currentStepNo - 1]}`], req.user);
    }

    res.json({
      success: true,
      current_step: nextStepNo,
      status: nextStatus
    });

  } catch (err) {
    console.error('Repair transition error:', err);
    res.status(500).json({ error: "Failed to progress panel in repair." });
  }
});

// ==========================================
// 2-Tier Logging Approvals REST Routes
// ==========================================

// 9. GET /api/approvals - Fetch pending approvals globally for both roles (Team Lead vs Manager+)
app.get('/api/approvals', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  try {
    // Both Team Leads and Managers/Superadmins see all pending clearances to view the full pipeline, but actions are role-locked.
    const approvalsRes = await query(`
      SELECT pl.*, p.barcode, p.sr_no, p.side, u.name as engineer_name, tl.name as team_lead_name
      FROM pending_logs pl
      JOIN panels p ON pl.panel_id = p.id
      JOIN users u ON pl.engineer_id = u.id
      LEFT JOIN users tl ON pl.team_lead_id = tl.id
      WHERE pl.approval_status IN ('Pending Team Lead', 'Pending Manager')
      ORDER BY pl.id ASC
    `, [], req.user);

    const approvals = approvalsRes.rows.map(row => ({
      ...row,
      step_name: STEP_NAMES[row.step_no - 1]
    }));

    res.json(approvals);
  } catch (err) {
    console.error('Approvals fetch error:', err);
    res.status(500).json({ error: "Failed to fetch approvals." });
  }
});

// 10. POST /api/approvals/tl-approve - Team Lead advances log to Manager (Strictly Team Lead only)
app.post('/api/approvals/tl-approve', authenticateJWT, authorize(['Team Lead']), async (req, res) => {
  const { pending_log_id } = req.body;
  if (!pending_log_id) {
    return res.status(400).json({ error: "Missing pending_log_id." });
  }

  try {
    const updateRes = await query(`
      UPDATE pending_logs 
      SET approval_status = 'Pending Manager', team_lead_id = $1, team_lead_approved_at = NOW()
      WHERE id = $2 AND approval_status = 'Pending Team Lead'
      RETURNING *
    `, [req.user.id, pending_log_id], req.user);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending approval log not found or already advanced." });
    }

    res.json({ success: true, log: updateRes.rows[0] });
  } catch (err) {
    console.error('TL approve error:', err);
    res.status(500).json({ error: "Server error during Team Lead approval." });
  }
});

// 11. POST /api/approvals/manager-approve - Manager commits log to database & updates panel (Manager/Superadmin only)
app.post('/api/approvals/manager-approve', authenticateJWT, authorize(['Manager', 'Superadmin']), async (req, res) => {
  const { pending_log_id } = req.body;
  if (!pending_log_id) {
    return res.status(400).json({ error: "Missing pending_log_id." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch pending log details
    const logRes = await client.query(`
      SELECT * FROM pending_logs 
      WHERE id = $1 AND approval_status = 'Pending Manager'
    `, [pending_log_id]);

    if (logRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Pending approval log not found or already committed." });
    }

    const pLog = logRes.rows[0];

    // 1. Insert into committed panel_logs
    await client.query(`
      INSERT INTO panel_logs (panel_id, step_id, engineer_id, status, remark)
      VALUES ($1, (SELECT id FROM repair_steps WHERE step_no = $2), $3, $4, $5)
    `, [pLog.panel_id, pLog.step_no, pLog.engineer_id, pLog.status, pLog.remark]);

    // 2. Update panel state depending on verdict
    let nextStepNo = pLog.step_no;
    let nextStatus = 'Repairable';
    let scrapReason = null;

    if (pLog.status === 'Scrap') {
      nextStatus = 'Scrap';
      scrapReason = pLog.remark || 'Scrapped during repair';

      await client.query(`
        UPDATE panels 
        SET status = $1, scrap_reason = $2, assigned_engineer_id = $3, updated_at = NOW()
        WHERE id = $4
      `, [nextStatus, scrapReason, pLog.engineer_id, pLog.panel_id]);
    } else if (pLog.status === 'Faulty') {
      await client.query(`
        UPDATE panels 
        SET assigned_engineer_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [pLog.engineer_id, pLog.panel_id]);
    } else if (pLog.status === 'OK') {
      nextStepNo = pLog.step_no + 1;

      await client.query(`
        UPDATE panels 
        SET current_step = $1, assigned_engineer_id = $2, updated_at = NOW()
        WHERE id = $3
      `, [nextStepNo, pLog.engineer_id, pLog.panel_id]);
    }

    // 3. Mark pending log as Approved in approvals list
    await client.query(`
      UPDATE pending_logs 
      SET approval_status = 'Approved', manager_id = $1, manager_approved_at = NOW()
      WHERE id = $2
    `, [req.user.id, pending_log_id]);

    await client.query('COMMIT');
    res.json({ success: true, current_step: nextStepNo, status: nextStatus });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Manager approve error:', err);
    res.status(500).json({ error: "Failed to finalize quality clearance transaction." });
  } finally {
    client.release();
  }
});

// 12. POST /api/approvals/reject - Rejects step log (Team Lead, Manager, Superadmin role-locked)
app.post('/api/approvals/reject', authenticateJWT, authorize(['Team Lead', 'Manager', 'Superadmin']), async (req, res) => {
  const { pending_log_id, rejection_reason } = req.body;
  if (!pending_log_id || !rejection_reason) {
    return res.status(400).json({ error: "Pending log ID and rejection reason are required." });
  }

  try {
    // Role-based status segregation for rejection
    const expectedStatus = req.user.role === 'Team Lead' ? 'Pending Team Lead' : 'Pending Manager';

    const updateRes = await query(`
      UPDATE pending_logs 
      SET approval_status = 'Rejected', rejection_reason = $1
      WHERE id = $2 AND approval_status = $3
      RETURNING *
    `, [rejection_reason, pending_log_id, expectedStatus], req.user);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending approval log not found or already processed for your role." });
    }

    res.json({ success: true, log: updateRes.rows[0] });
  } catch (err) {
    console.error('Rejection error:', err);
    res.status(500).json({ error: "Server error during log rejection." });
  }
});

// 13. GET /api/stock/history/:id - Fetch panel list for a specific lot
app.get('/api/stock/history/:id', authenticateJWT, async (req, res) => {
  try {
    const panelsRes = await query(`
      SELECT p.*, u.name as engineer_name 
      FROM panels p
      LEFT JOIN users u ON p.assigned_engineer_id = u.id
      WHERE p.lot_id = $1
      ORDER BY p.sr_no ASC
    `, [req.params.id], req.user);
    res.json(panelsRes.rows);
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: "Failed to load lot panel history." });
  }
});

// 14. POST /api/stock/toggle/:id - Toggle lot complete/in-process status (Manager/Superadmin only)
app.post('/api/stock/toggle/:id', authenticateJWT, authorize(['Manager', 'Superadmin']), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lotRes = await client.query('SELECT status FROM lots WHERE id = $1', [req.params.id]);
    if (lotRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Lot not found." });
    }

    const currentStatus = lotRes.rows[0].status;

    // Lock check: Only superadmin can unlock a completed lot
    if (currentStatus === 'Complete' && req.user.role !== 'Superadmin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Access denied. Lot is Complete and locked. Only a Superadmin can unlock it." });
    }

    const nextStatus = currentStatus === 'Complete' ? 'In Process' : 'Complete';

    await client.query('UPDATE lots SET status = $1 WHERE id = $2', [nextStatus, req.params.id]);

    // Log the toggle action
    await client.query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, actor_id, remarks)
      VALUES ($1, 'Status Toggle', $2, $3)
    `, [req.params.id, req.user.id, `Lot status toggled from ${currentStatus} to ${nextStatus}`]);

    await client.query('COMMIT');
    res.json({ success: true, status: nextStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Lot status toggle error:', err);
    res.status(500).json({ error: "Failed to toggle lot status." });
  } finally {
    client.release();
  }
});

// ============================================================================
// Lot-Level 12-Step Production Logging with strict Checksums & 2-Tier Approvals
// ============================================================================

// A. Helper to get step-wise aggregates (committed + pending logs)
const getStepSum = async (lotId, stepNo, fields) => {
  const selectCommitted = fields.map(f => `COALESCE(SUM((step_data->>'${f}')::integer), 0) AS ${f}`).join(', ');
  const comRes = await query(`SELECT ${selectCommitted} FROM production_logs WHERE lot_id = $1 AND step_no = $2`, [lotId, stepNo]);

  const selectPending = fields.map(f => `COALESCE(SUM((step_data->>'${f}')::integer), 0) AS ${f}`).join(', ');
  const penRes = await query(`SELECT ${selectPending} FROM pending_production_logs WHERE lot_id = $1 AND step_no = $2 AND approval_status NOT IN ('Approved', 'Rejected')`, [lotId, stepNo]);

  const result = {};
  fields.forEach(f => {
    result[f] = parseInt(comRes.rows[0][f] || 0) + parseInt(penRes.rows[0][f] || 0);
  });
  return result;
};

// 1. GET /api/production/logs - Fetch all approved production logs
app.get('/api/production/logs', authenticateJWT, async (req, res) => {
  const { lot_id, step_no } = req.query;
  let q = `
    SELECT pl.*, l.lot_no, l.batch_no, l.pixel_pitch, u.name as operator_name 
    FROM production_logs pl
    JOIN lots l ON pl.lot_id = l.id
    LEFT JOIN users u ON pl.operator_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (lot_id) {
    params.push(parseInt(lot_id));
    q += ` AND pl.lot_id = $${params.length}`;
  }
  if (step_no) {
    params.push(parseInt(step_no));
    q += ` AND pl.step_no = $${params.length}`;
  }
  q += ` ORDER BY pl.timestamp DESC`;

  try {
    const resLogs = await query(q, params);
    res.json(resLogs.rows);
  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ error: "Failed to fetch production logs." });
  }
});

// 2. GET /api/production/pending - Fetch pending logs for clearances
app.get('/api/production/pending', authenticateJWT, async (req, res) => {
  const { step_no } = req.query;
  let q = `
    SELECT pl.*, l.lot_no, l.batch_no, l.pixel_pitch, u.name as operator_name, tl.name as team_lead_name, mgr.name as manager_name
    FROM pending_production_logs pl
    JOIN lots l ON pl.lot_id = l.id
    LEFT JOIN users u ON pl.operator_id = u.id
    LEFT JOIN users tl ON pl.team_lead_id = tl.id
    LEFT JOIN users mgr ON pl.manager_id = mgr.id
    WHERE 1=1
  `;
  const params = [];

  // Fetch all pending approvals at both Team Lead and Manager stages so users can see the full pending pipeline
  q += ` AND pl.approval_status IN ('Pending Team Lead', 'Pending Manager')`;

  if (step_no) {
    params.push(parseInt(step_no));
    q += ` AND pl.step_no = $${params.length}`;
  }

  q += ` ORDER BY pl.timestamp DESC`;

  try {
    const resLogs = await query(q, params);
    res.json(resLogs.rows);
  } catch (err) {
    console.error('Fetch pending logs error:', err);
    res.status(500).json({ error: "Failed to fetch pending production logs." });
  }
});

// 3. POST /api/production/log - Create a pending step log entry (Employee only!)
app.post('/api/production/log', authenticateJWT, authorize(['Employee']), async (req, res) => {
  const { lot_id, step_no, pcb_type, step_data } = req.body;

  if (!lot_id || !step_no || !pcb_type || !step_data) {
    return res.status(400).json({ error: "Missing required entry fields." });
  }

  try {
    const lotId = parseInt(lot_id);
    const stepNo = parseInt(step_no);
    const lotRes = await query('SELECT * FROM lots WHERE id = $1', [lotId]);
    if (lotRes.rowCount === 0) {
      return res.status(404).json({ error: "Selected lot does not exist." });
    }
    const lot = lotRes.rows[0];
    const step1 = await getStepSum(lotId, 1, ['qty_received']);
    const received_qty = step1.qty_received > 0 ? step1.qty_received : lot.received_qty;

    // Strict Checksum & Conservation of Units Verification
    if (stepNo === 2) {
      const { repairable_qty, scrap_qty } = step_data;
      const existing = await getStepSum(lotId, 2, ['repairable_qty', 'scrap_qty']);
      const total = existing.repairable_qty + existing.scrap_qty + parseInt(repairable_qty || 0) + parseInt(scrap_qty || 0);
      if (total > received_qty) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total segregated PCBs (${total}) would exceed the actual received quantity (${received_qty}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 3) {
      const { code_ok, code_not_ok } = step_data;
      const step2 = await getStepSum(lotId, 2, ['repairable_qty']);
      const existing = await getStepSum(lotId, 3, ['code_ok', 'code_not_ok']);
      const total = existing.code_ok + existing.code_not_ok + parseInt(code_ok || 0) + parseInt(code_not_ok || 0);
      if (total > step2.repairable_qty) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total programmed PCBs (${total}) would exceed the segregated repairable quantity (${step2.repairable_qty}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 4) {
      const { qty_passed, qty_failed } = step_data;
      const step3 = await getStepSum(lotId, 3, ['code_ok']);
      const existing = await getStepSum(lotId, 4, ['qty_passed', 'qty_failed']);
      const total = existing.qty_passed + existing.qty_failed + parseInt(qty_passed || 0) + parseInt(qty_failed || 0);
      if (total > step3.code_ok) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total tested PCBs (${total}) would exceed the programmed OK quantity (${step3.code_ok}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 5) {
      const { debug_ok, critical_qty, scrap_qty } = step_data;
      const step4 = await getStepSum(lotId, 4, ['qty_failed']);
      const existing = await getStepSum(lotId, 5, ['debug_ok', 'critical_qty', 'scrap_qty']);
      const total = existing.debug_ok + existing.critical_qty + existing.scrap_qty + parseInt(debug_ok || 0) + parseInt(critical_qty || 0) + parseInt(scrap_qty || 0);
      if (total > step4.qty_failed) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total debugged PCBs (${total}) would exceed the failed quantity from 1st Testing (${step4.qty_failed}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 6) {
      const { entry_count } = step_data;
      const step4 = await getStepSum(lotId, 4, ['qty_passed']);
      const step5 = await getStepSum(lotId, 5, ['debug_ok']);
      const limit = step4.qty_passed + step5.debug_ok;
      const existing = await getStepSum(lotId, 6, ['entry_count']);
      const total = existing.entry_count + parseInt(entry_count || 0);
      if (total > limit) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total entered PCBs (${total}) would exceed the passed/debugged count (${limit}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 7) {
      const { qty_cleaned, qc_reject } = step_data;
      const step6 = await getStepSum(lotId, 6, ['entry_count']);
      const existing = await getStepSum(lotId, 7, ['qty_cleaned', 'qc_reject']);
      const total = existing.qty_cleaned + existing.qc_reject + parseInt(qty_cleaned || 0) + parseInt(qc_reject || 0);
      if (total > step6.entry_count) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total cleaned PCBs (${total}) would exceed the entry count (${step6.entry_count}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 8) {
      const { qty_passed, qty_failed } = step_data;
      const step7 = await getStepSum(lotId, 7, ['qty_cleaned']);
      const existing = await getStepSum(lotId, 8, ['qty_passed', 'qty_failed']);
      const total = existing.qty_passed + existing.qty_failed + parseInt(qty_passed || 0) + parseInt(qty_failed || 0);
      if (total > step7.qty_cleaned) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total QC-inspected PCBs (${total}) would exceed the cleaned count (${step7.qty_cleaned}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 9) {
      const { qty_coated } = step_data;
      const step8 = await getStepSum(lotId, 8, ['qty_passed']);
      const existing = await getStepSum(lotId, 9, ['qty_coated']);
      const total = existing.qty_coated + parseInt(qty_coated || 0);
      if (total > step8.qty_passed) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total coated PCBs (${total}) would exceed the QC-passed count (${step8.qty_passed}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 10) {
      const { qty_passed, qty_failed } = step_data;
      const step9 = await getStepSum(lotId, 9, ['qty_coated']);
      const existing = await getStepSum(lotId, 10, ['qty_passed', 'qty_failed']);
      const total = existing.qty_passed + existing.qty_failed + parseInt(qty_passed || 0) + parseInt(qty_failed || 0);
      if (total > step9.qty_coated) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total final-tested PCBs (${total}) would exceed the coated count (${step9.qty_coated}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 11) {
      const { bubble_packed, box_packed } = step_data;
      const step10 = await getStepSum(lotId, 10, ['qty_passed']);
      const existing = await getStepSum(lotId, 11, ['bubble_packed', 'box_packed']);
      const total = existing.bubble_packed + existing.box_packed + parseInt(bubble_packed || 0) + parseInt(box_packed || 0);
      if (total > step10.qty_passed) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total packed PCBs (${total}) would exceed the final test-passed count (${step10.qty_passed}) of Lot ${lot.lot_no}.` });
      }
    } else if (stepNo === 12) {
      const { entry_count } = step_data;
      const step11 = await getStepSum(lotId, 11, ['bubble_packed', 'box_packed']);
      const limit = step11.bubble_packed + step11.box_packed;
      const existing = await getStepSum(lotId, 12, ['entry_count']);
      const total = existing.entry_count + parseInt(entry_count || 0);
      if (total > limit) {
        return res.status(400).json({ error: `🚫 Checksum Error: Total final entries (${total}) would exceed the packed count (${limit}) of Lot ${lot.lot_no}.` });
      }
    }

    // Shortage calculations for Inward (Step 1)
    if (stepNo === 1) {
      const qty_rec = parseInt(step_data.qty_received || 0);
      const expected = parseInt(step_data.expected_qty || 0);
      step_data.shortage = expected - qty_rec;
    }

    // Insert pending log log (Awaiting TL and Manager approvals)
    const insRes = await query(`
      INSERT INTO pending_production_logs (lot_id, step_no, pcb_type, operator_id, step_data, approval_status)
      VALUES ($1, $2, $3, $4, $5, 'Pending Team Lead')
      RETURNING *
    `, [lotId, stepNo, pcb_type, req.user.id, JSON.stringify(step_data)]);

    res.status(201).json({
      success: true,
      pending: true,
      log: insRes.rows[0],
      message: "Step production log submitted successfully! Awaiting Team Lead & Manager clearances."
    });

  } catch (err) {
    console.error('Log creation error:', err);
    res.status(500).json({ error: "Failed to record pending step log entry." });
  }
});

// 4. POST /api/production/tl-approve - Team Lead advanced log to Manager (Strictly Team Lead only)
app.post('/api/production/tl-approve', authenticateJWT, authorize(['Team Lead']), async (req, res) => {
  const { pending_log_id } = req.body;
  if (!pending_log_id) {
    return res.status(400).json({ error: "Missing pending log ID." });
  }

  try {
    const updateRes = await query(`
      UPDATE pending_production_logs 
      SET approval_status = 'Pending Manager', team_lead_id = $1, team_lead_approved_at = NOW()
      WHERE id = $2 AND approval_status = 'Pending Team Lead'
      RETURNING *
    `, [req.user.id, pending_log_id]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending log not found or already verified." });
    }

    res.json({ success: true, log: updateRes.rows[0] });
  } catch (err) {
    console.error('TL approve error:', err);
    res.status(500).json({ error: "Failed to approve log at Team Lead stage." });
  }
});

// 5. POST /api/production/manager-approve - Manager commits log to final DB
app.post('/api/production/manager-approve', authenticateJWT, authorize(['Manager', 'Superadmin']), async (req, res) => {
  const { pending_log_id } = req.body;
  if (!pending_log_id) {
    return res.status(400).json({ error: "Missing pending log ID." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const logRes = await client.query('SELECT * FROM pending_production_logs WHERE id = $1 AND approval_status = ' + "'Pending Manager'", [pending_log_id]);
    if (logRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Pending manager clearance not found." });
    }

    const pLog = logRes.rows[0];

    // Insert into final production_logs
    await client.query(`
      INSERT INTO production_logs (lot_id, step_no, pcb_type, operator_id, step_data, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [pLog.lot_id, pLog.step_no, pLog.pcb_type, pLog.operator_id, pLog.step_data, pLog.timestamp]);

    // Update pending log to Approved status
    await client.query(`
      UPDATE pending_production_logs 
      SET approval_status = 'Approved', manager_id = $1, manager_approved_at = NOW()
      WHERE id = $2
    `, [req.user.id, pending_log_id]);

    // Adjust lot stats if Step 1 (Inward) is committed
    if (pLog.step_no === 1) {
      const recCount = parseInt(pLog.step_data.qty_received || 0);
      await client.query('UPDATE lots SET received_qty = $1 WHERE id = $2', [recCount, pLog.lot_id]);
    }

    // Adjust lot stats if Step 12 (Final Entry) is committed
    if (pLog.step_no === 12) {
      const finalCount = parseInt(pLog.step_data.entry_count || 0);
      await client.query('UPDATE lots SET dispatched_qty = COALESCE(dispatched_qty, 0) + $1 WHERE id = $2', [finalCount, pLog.lot_id]);

      // Auto-toggle lot status to Complete if limit reached
      const checkLot = await client.query('SELECT * FROM lots WHERE id = $1', [pLog.lot_id]);
      const activeLot = checkLot.rows[0];
      if (activeLot.dispatched_qty >= activeLot.received_qty) {
        await client.query("UPDATE lots SET status = 'Complete' WHERE id = $1", [pLog.lot_id]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Production log committed and approved successfully!" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Manager approve error:', err);
    res.status(500).json({ error: "Failed to commit approved production log." });
  } finally {
    client.release();
  }
});

// 6. POST /api/production/reject - Reject pending log with reason (Team Lead vs Manager+)
app.post('/api/production/reject', authenticateJWT, authorize(['Team Lead', 'Manager', 'Superadmin']), async (req, res) => {
  const { pending_log_id, rejection_reason } = req.body;
  if (!pending_log_id || !rejection_reason) {
    return res.status(400).json({ error: "Pending log ID and rejection reason are required." });
  }

  try {
    // Role-based status segregation for rejection
    const expectedStatus = req.user.role === 'Team Lead' ? 'Pending Team Lead' : 'Pending Manager';

    const updateRes = await query(`
      UPDATE pending_production_logs 
      SET approval_status = 'Rejected', rejection_reason = $1
      WHERE id = $2 AND approval_status = $3
      RETURNING *
    `, [rejection_reason, pending_log_id, expectedStatus]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending production log not found or already processed for your role." });
    }

    res.json({ success: true, log: updateRes.rows[0] });
  } catch (err) {
    console.error('Reject log error:', err);
    res.status(500).json({ error: "Failed to reject pending production log." });
  }
});

// 7. GET /api/production/stats/:lot_id - Fetch step-wise aggregates and checksums for a lot
app.get('/api/production/stats/:lot_id', authenticateJWT, async (req, res) => {
  try {
    const lotId = parseInt(req.params.lot_id);
    const lotRes = await query('SELECT * FROM lots WHERE id = $1', [lotId]);
    if (lotRes.rowCount === 0) {
      return res.status(404).json({ error: "Lot not found." });
    }
    const lot = lotRes.rows[0];

    const step1Sum = await getStepSum(lotId, 1, ['qty_received']);
    const effectiveReceivedQty = step1Sum.qty_received > 0 ? step1Sum.qty_received : lot.received_qty;

    const stats = {
      lot_no: lot.lot_no,
      batch_no: lot.batch_no,
      pixel_pitch: lot.pixel_pitch,
      qty_sent: lot.qty_sent,
      received_qty: effectiveReceivedQty,
      dispatched_qty: lot.dispatched_qty,
      steps: {}
    };

    // Pull sums sequentially for the 12 steps
    stats.steps[1] = { inward: effectiveReceivedQty, expected: lot.qty_sent, shortage: lot.qty_sent - effectiveReceivedQty };
    stats.steps[2] = await getStepSum(lotId, 2, ['repairable_qty', 'scrap_qty']);
    stats.steps[3] = await getStepSum(lotId, 3, ['code_ok', 'code_not_ok']);
    stats.steps[4] = await getStepSum(lotId, 4, ['qty_passed', 'qty_failed']);
    stats.steps[5] = await getStepSum(lotId, 5, ['debug_ok', 'critical_qty', 'scrap_qty']);
    stats.steps[6] = await getStepSum(lotId, 6, ['entry_count']);
    stats.steps[7] = await getStepSum(lotId, 7, ['qty_cleaned', 'qc_reject']);
    stats.steps[8] = await getStepSum(lotId, 8, ['qty_passed', 'qty_failed']);
    stats.steps[9] = await getStepSum(lotId, 9, ['qty_coated']);
    stats.steps[10] = await getStepSum(lotId, 10, ['qty_passed', 'qty_failed']);
    stats.steps[11] = await getStepSum(lotId, 11, ['bubble_packed', 'box_packed']);
    stats.steps[12] = await getStepSum(lotId, 12, ['entry_count']);

    res.json(stats);
  } catch (err) {
    console.error('Stats aggregation error:', err);
    res.status(500).json({ error: "Failed to compile lot production stats." });
  }
});

// ============================================================================
// Superadmin User Management & Administration Endpoints
// ============================================================================

// 8. GET /api/admin/users - Fetch all system users (Superadmin only)
app.get('/api/admin/users', authenticateJWT, authorize(['Superadmin']), async (req, res) => {
  try {
    const userRes = await query('SELECT id, name, email, role, attendance_rate, avatar, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(userRes.rows);
  } catch (err) {
    console.error('Fetch admin users error:', err);
    res.status(500).json({ error: "Failed to fetch user accounts." });
  }
});

// 9. POST /api/admin/users - Securely create a new user account (Superadmin only)
app.post('/api/admin/users', authenticateJWT, authorize(['Superadmin']), async (req, res) => {
  const { name, email, password, role, attendance_rate } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required." });
  }

  try {
    // Check if name or email already exists
    const checkRes = await query('SELECT id FROM users WHERE name = $1 OR email = $2', [name, email]);
    if (checkRes.rowCount > 0) {
      return res.status(400).json({ error: "A user with this Name or Email already exists." });
    }

    // Hash the password securely
    const password_hash = await bcrypt.hash(password, 10);
    const attendance = parseFloat(attendance_rate || 95.0);
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    const insRes = await query(`
      INSERT INTO users (name, email, password_hash, role, attendance_rate, avatar)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, attendance_rate, avatar, is_active, created_at
    `, [name, email, password_hash, role, attendance, avatar]);

    res.status(201).json({ success: true, message: "User account created successfully!", user: insRes.rows[0] });
  } catch (err) {
    console.error('Create admin user error:', err);
    res.status(500).json({ error: "Failed to create user account." });
  }
});

// 10. POST /api/admin/users/toggle/:id - Toggle active/inactive status of a user (Superadmin only)
app.post('/api/admin/users/toggle/:id', authenticateJWT, authorize(['Superadmin']), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    // Prevent Superadmin from deactivating themselves
    if (targetId === req.user.id) {
      return res.status(400).json({ error: "You cannot deactivate your own administrative account." });
    }

    const checkRes = await query('SELECT id, is_active FROM users WHERE id = $1', [targetId]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ error: "Target user not found." });
    }

    const newStatus = !checkRes.rows[0].is_active;
    const updRes = await query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active', [newStatus, targetId]);

    res.json({
      success: true,
      message: `User '${updRes.rows[0].name}' has been ${newStatus ? 'activated' : 'deactivated'} successfully!`,
      user: updRes.rows[0]
    });
  } catch (err) {
    console.error('Toggle user status error:', err);
    res.status(500).json({ error: "Failed to toggle user account status." });
  }
});

// 11. POST /api/admin/email/dispatch - Simulates and logs discrepancy email dispatch (Superadmin only)
app.post('/api/admin/email/dispatch', authenticateJWT, authorize(['Superadmin']), async (req, res) => {
  const {
    lot_id,
    recipient_email,
    recipient_name,
    challan_no,
    qty_sent,
    received_qty,
    cc_emails,
    subject,
    custom_remarks
  } = req.body;

  if (!lot_id || !recipient_email || !recipient_name) {
    return res.status(400).json({ error: "Missing required dispatch fields." });
  }

  try {
    const lotRes = await query('SELECT * FROM lots WHERE id = $1', [parseInt(lot_id)]);
    if (lotRes.rowCount === 0) {
      return res.status(404).json({ error: "Lot not found." });
    }
    const lot = lotRes.rows[0];

    const diff = Math.abs(parseInt(qty_sent) - parseInt(received_qty));
    const isShortage = parseInt(received_qty) < parseInt(qty_sent);
    const discrepancyType = isShortage ? 'Short' : 'Excess';

    // Compile the formal HTML Email body
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px; background-color: #f9f9f9; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    h2, h3 { color: #111827; }
    p { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; text-align: left; }
    th { background-color: #ffd400; color: #000000; font-weight: bold; border: 1px solid #dddddd; padding: 10px; text-align: center; }
    td { border: 1px solid #dddddd; padding: 10px; text-align: center; }
    .highlight-yellow { background-color: #fef08a; }
    .diff-cell { font-weight: bold; color: #ffffff; }
    .diff-short { background-color: #ef4444 !important; }
    .diff-excess { background-color: #fb923c !important; }
    .signature { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #666666; }
  </style>
</head>
<body>
  <div class="email-container">
    <p>Dear ${recipient_name},</p>
    <p>Greetings from Electrolyte Solutions..!</p>
    
    ${lot.client_name === 'Atomberg' ? `
      <p>I would like to inform you about discrepancies observed in the PCB received against Challan No. <strong>${challan_no || 'N/A'}</strong>. The following table provides detailed information on the short and excess quantities received:</p>
    ` : `
      <p>We have checked Lot No. <strong>${lot.lot_no}</strong> and found some PCB quantity differences (short/excess). Details are shared below. Kindly review and update.</p>
    `}

    <table>
      <thead>
        <tr>
          <th>Challan No. / Ref</th>
          <th>Challan Qty</th>
          <th>Received Qty</th>
          <th>Diff</th>
          <th>Discrepancy Type</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="highlight-yellow">${challan_no || `Lot ${lot.lot_no}`}</td>
          <td class="highlight-yellow">${qty_sent}</td>
          <td class="highlight-yellow">${received_qty}</td>
          <td class="diff-cell ${isShortage ? 'diff-short' : 'diff-excess'}">${isShortage ? `-${diff}` : `+${diff}`}</td>
          <td class="highlight-yellow">${discrepancyType}</td>
        </tr>
      </tbody>
    </table>

    ${custom_remarks ? `<p>${custom_remarks}</p>` : `
      ${lot.client_name === 'Atomberg' ? `
        <p>Kindly suggest the way forward and would like to invite @CC CWH Mumbai Spare and @Chetan Joshi Sir to visit our facility and cross verify the quantities.</p>
      ` : `
        <p>Please let us know if any further information is required from our side</p>
      `}
    `}

    <div class="signature">
      Warm regards,<br>
      <strong>Electrolyte Solutions Team</strong><br>
      <span style="font-size: 11px; color: #9ca3af;">Automated Operations Dispatcher</span>
    </div>
  </div>
</body>
</html>
    `;

    // Firing Live Email if SMTP credentials are set
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log(`[SMTP] Attempting live email dispatch from ${process.env.EMAIL_USER} to ${recipient_email}...`);
      await transporter.sendMail({
        from: `"Electrolyte Solutions" <${process.env.EMAIL_USER}>`,
        to: recipient_email.trim(),
        cc: cc_emails ? cc_emails.split(',').map(email => email.trim()) : undefined,
        subject: subject,
        html: emailHtml,
      });
      console.log('[SMTP] Live email sent successfully!');
    }

    // Create the scratch/dispatched_emails output directory
    let fileWritten = false;
    let fileName = '';
    let filePath = '';

    try {
      const outputDir = path.join(__dirname, '../scratch/dispatched_emails');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fileName = `email_lot_${lot.lot_no}_${Date.now()}.html`;
      filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, emailHtml, 'utf8');
      fileWritten = true;
    } catch (fsErr) {
      console.warn('[FS Warning] Could not write local email backup (ephemeral or read-only filesystem):', fsErr.message);
    }

    // Insert an audit transaction log in the database
    const remarks = `Discrepancy email dispatched to ${recipient_email} (${recipient_name}) regarding Lot #${lot.lot_no}.${fileWritten ? ` File: ${fileName}` : ' (Read-only filesystem: local backup skipped)'}`;
    await query(`
      INSERT INTO lot_transactions (lot_id, transaction_type, actor_id, remarks)
      VALUES ($1, 'Email Dispatch', $2, $3)
    `, [lot.id, req.user.id, remarks]);

    const isLiveDispatch = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    res.json({
      success: true,
      message: isLiveDispatch
        ? "Discrepancy email dispatched live successfully!"
        : `Discrepancy email simulated successfully! ${fileWritten ? 'Output saved to scratch/dispatched_emails/' + fileName : 'Local filesystem is read-only, simulation logged.'}`,
      file_path: fileWritten ? filePath : null,
      file_name: fileWritten ? fileName : null
    });

  } catch (err) {
    console.error('Email dispatch error:', err);
    res.status(500).json({ error: "Failed to dispatch simulated email." });
  }
});

app.listen(port, () => {
  console.log(`Electrolyte Solutions API server listening at http://localhost:${port}`);
});
