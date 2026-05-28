import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool, { query } from './db.js';

dotenv.config();

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

// 14 fixed steps matching the official build tracker PDF
const STEP_NAMES = [
  "Panel Assign",
  "Repair Aging",
  "Panel Opening",
  "Silicon Removing",
  "IC Removing",
  "IC Cleaning",
  "IC Replacing",
  "Debugging",
  "1st Aging",
  "Applying Silicon",
  "Half Fitting",
  "Mesh Fitting",
  "QC",
  "Dispatch"
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
        "SELECT COUNT(*) FROM panels WHERE lot_id = $1 AND current_step = 14 AND status != 'Scrap'",
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

    for (let i = 1; i <= 14; i++) {
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
      if (i !== 14 && countVal > 10) {
        bottleneckAlerts.push({
          type: "bottleneck",
          step_no: i,
          step_name: STEP_NAMES[i - 1],
          count: countVal,
          message: `Bottleneck detected at Step ${i} (${STEP_NAMES[i - 1]}): ${countVal} panels pending.`
        });
      }
    }

    totalPending = stepBreakdown.reduce((sum, item) => sum + (item.step_no !== 14 ? item.count : 0), 0);

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

// 2. GET /api/stock - Fetch stock summary and lots (All authenticated users)
app.get('/api/stock', authenticateJWT, async (req, res) => {
  try {
    const lotsRes = await query('SELECT * FROM lots ORDER BY lot_no DESC');
    const lotsSummary = [];

    for (const lot of lotsRes.rows) {
      // Dispatched count
      const dispRes = await query("SELECT COUNT(*) FROM panels WHERE lot_id = $1 AND current_step = 14 AND status != 'Scrap'", [lot.id]);
      const dispatched = parseInt(dispRes.rows[0].count);

      // Scrap count
      const scrapRes = await query("SELECT COUNT(*) FROM panels WHERE lot_id = $1 AND status = 'Scrap'", [lot.id]);
      const scrap = parseInt(scrapRes.rows[0].count);

      const available = lot.received_qty - dispatched - scrap;

      // Retrieve client name
      const clientRes = await query("SELECT name FROM clients WHERE id = $1", [lot.client_id]);
      const clientName = clientRes.rowCount > 0 ? clientRes.rows[0].name : "Unknown";

      lotsSummary.push({
        ...lot,
        client_name: clientName,
        dispatched_qty: dispatched,
        return_qty: scrap, // Returns mapped to scraps
        available
      });
    }

    res.json(lotsSummary);
  } catch (err) {
    console.error('Stock error:', err);
    res.status(500).json({ error: "Failed to load stock data." });
  }
});

// 3. POST /api/stock/inward - Ship lot inwards (Superadmin, Manager, Team Lead)
app.post('/api/stock/inward', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  const { lot_no, batch_no, pixel_pitch, client_name, qty_sent, qty_received, remarks } = req.body;
  
  if (!lot_no || !batch_no || !pixel_pitch || !client_name || qty_sent === undefined || qty_received === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const checkExist = await query('SELECT id FROM lots WHERE lot_no = $1', [lot_no]);
    if (checkExist.rowCount > 0) {
      return res.status(400).json({ error: `Lot number ${lot_no} already exists.` });
    }

    // Insert client if not exists
    let clientRes = await query('SELECT id FROM clients WHERE name = $1', [client_name]);
    let clientId;
    if (clientRes.rowCount === 0) {
      const insClient = await query('INSERT INTO clients (name) VALUES ($1) RETURNING id', [client_name]);
      clientId = insClient.rows[0].id;
    } else {
      clientId = clientRes.rows[0].id;
    }

    const insertRes = await query(`
      INSERT INTO lots (lot_no, batch_no, pixel_pitch, client_id, qty_sent, received_qty, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [lot_no, batch_no, pixel_pitch, clientId, qty_sent, qty_received, remarks]);

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('Inward error:', err);
    res.status(500).json({ error: "Failed to record inward shipment." });
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
      // 1. PCBs Repaired (Step 14 complete)
      const repRes = await query(`
        SELECT COUNT(DISTINCT panel_id) FROM panel_logs 
        WHERE engineer_id = $1 AND step_id = (SELECT id FROM repair_steps WHERE step_no = 14)
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
    if (panel.current_step === 14) {
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

// 9. GET /api/approvals - Fetch pending approvals depending on role (Team Lead vs Manager+)
app.get('/api/approvals', authenticateJWT, authorize(['Superadmin', 'Manager', 'Team Lead']), async (req, res) => {
  try {
    let approvalsRes;
    if (req.user.role === 'Team Lead') {
      // Team Leads see Pending Team Lead approvals
      approvalsRes = await query(`
        SELECT pl.*, p.barcode, p.sr_no, p.side, u.name as engineer_name 
        FROM pending_logs pl
        JOIN panels p ON pl.panel_id = p.id
        JOIN users u ON pl.engineer_id = u.id
        WHERE pl.approval_status = 'Pending Team Lead'
        ORDER BY pl.id ASC
      `, [], req.user);
    } else {
      // Managers and Superadmins see Pending Manager approvals
      approvalsRes = await query(`
        SELECT pl.*, p.barcode, p.sr_no, p.side, u.name as engineer_name, tl.name as team_lead_name
        FROM pending_logs pl
        JOIN panels p ON pl.panel_id = p.id
        JOIN users u ON pl.engineer_id = u.id
        LEFT JOIN users tl ON pl.team_lead_id = tl.id
        WHERE pl.approval_status = 'Pending Manager'
        ORDER BY pl.id ASC
      `, [], req.user);
    }

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

// 10. POST /api/approvals/tl-approve - Team Lead advances log to Manager (Team Lead/Superadmin/Manager)
app.post('/api/approvals/tl-approve', authenticateJWT, authorize(['Team Lead', 'Superadmin', 'Manager']), async (req, res) => {
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

// 12. POST /api/approvals/reject - Rejects step log (Team Lead, Manager, Superadmin)
app.post('/api/approvals/reject', authenticateJWT, authorize(['Team Lead', 'Manager', 'Superadmin']), async (req, res) => {
  const { pending_log_id, rejection_reason } = req.body;
  if (!pending_log_id || !rejection_reason) {
    return res.status(400).json({ error: "Pending log ID and rejection reason are required." });
  }

  try {
    const updateRes = await query(`
      UPDATE pending_logs 
      SET approval_status = 'Rejected', rejection_reason = $1
      WHERE id = $2 AND approval_status IN ('Pending Team Lead', 'Pending Manager')
      RETURNING *
    `, [rejection_reason, pending_log_id], req.user);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending approval log not found or already processed." });
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
  try {
    const lotRes = await query('SELECT status FROM lots WHERE id = $1', [req.params.id]);
    if (lotRes.rowCount === 0) {
      return res.status(404).json({ error: "Lot not found." });
    }
    const nextStatus = lotRes.rows[0].status === 'Complete' ? 'In Process' : 'Complete';
    await query('UPDATE lots SET status = $1 WHERE id = $2', [nextStatus, req.params.id]);
    res.json({ success: true, status: nextStatus });
  } catch (err) {
    console.error('Lot status toggle error:', err);
    res.status(500).json({ error: "Failed to toggle lot status." });
  }
});

app.listen(port, () => {
  console.log(`Electrolyte Solutions API server listening at http://localhost:${port}`);
});
