import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize dotenv in db.js to load environment variables before Pool instantiation
dotenv.config();

// Create connection pool to electrolyte_db using environment variables or defaults
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: process.env.DB_USER || undefined,
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'electrolyte_db',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
    });

let useFallback = false;

// Tables store in memory
const tables = {
  clients: [],
  users: [],
  lots: [],
  repair_steps: [
    { id: 1, step_no: 1, name: 'Panel Assign' },
    { id: 2, step_no: 2, name: 'Repair Aging' },
    { id: 3, step_no: 3, name: 'Panel Opening' },
    { id: 4, step_no: 4, name: 'Silicon Removing' },
    { id: 5, step_no: 5, name: 'IC Removing' },
    { id: 6, step_no: 6, name: 'IC Cleaning' },
    { id: 7, step_no: 7, name: 'IC Replacing' },
    { id: 8, step_no: 8, name: 'Debugging' },
    { id: 9, step_no: 9, name: '1st Aging' },
    { id: 10, step_no: 10, name: 'Applying Silicon' },
    { id: 11, step_no: 11, name: 'Half Fitting' },
    { id: 12, step_no: 12, name: 'Mesh Fitting' },
    { id: 13, step_no: 13, name: 'QC' },
    { id: 14, step_no: 14, name: 'Dispatch' }
  ],
  panels: [],
  panel_logs: [],
  defect_codes: [],
  performance_scores: [],
  pending_logs: [],
  lot_transactions: []
};

// --- Seed Parsing Helpers ---

function splitSqlValues(valStr) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  let parenDepth = 0;
  for (let i = 0; i < valStr.length; i++) {
    const char = valStr[i];
    if (char === "'" && (i === 0 || valStr[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && char === '(') {
      parenDepth++;
      current += char;
    } else if (!inQuotes && char === ')') {
      parenDepth--;
      current += char;
    } else if (char === ',' && !inQuotes && parenDepth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function parseSqlValue(val) {
  val = val.trim();
  if (val.toLowerCase() === 'null') return null;
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;

  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/''/g, "'");
  }
  if (!isNaN(val)) {
    return Number(val);
  }
  if (val.startsWith('(') && val.endsWith(')')) {
    const subquery = val.slice(1, -1).trim();
    const selectMatch = subquery.match(/SELECT\s+(\w+)\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
    if (selectMatch) {
      const [, colToSelect, tblName, whereClause] = selectMatch;
      const whereMatch = whereClause.match(/(\w+)\s*=\s*(.+)/);
      if (whereMatch) {
        const [, whereCol, whereValRaw] = whereMatch;
        const whereVal = parseSqlValue(whereValRaw);
        const row = (tables[tblName] || []).find(r => r[whereCol] === whereVal);
        if (row) {
          return row[colToSelect];
        }
      }
    }
  }
  return val;
}

function parseInsertLine(line) {
  const insertIndex = line.indexOf('INSERT INTO ');
  if (insertIndex === -1) return;

  const afterInsert = line.slice(insertIndex + 12);
  const openParen = afterInsert.indexOf('(');
  if (openParen === -1) return;
  const tblName = afterInsert.slice(0, openParen).trim().toLowerCase();

  if (!tables[tblName]) {
    tables[tblName] = [];
  }

  const closeParen = afterInsert.indexOf(')');
  if (closeParen === -1) return;
  const cols = afterInsert.slice(openParen + 1, closeParen).split(',').map(c => c.trim());

  const valuesKeyword = afterInsert.indexOf('VALUES', closeParen);
  if (valuesKeyword === -1) return;

  const valStartParen = afterInsert.indexOf('(', valuesKeyword);
  if (valStartParen === -1) return;

  let parenDepth = 1;
  let inQuotes = false;
  let valEndParen = valStartParen;
  for (let i = valStartParen + 1; i < afterInsert.length; i++) {
    const char = afterInsert[i];
    if (char === "'" && (i === 0 || afterInsert[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === '(') {
      parenDepth++;
    } else if (!inQuotes && char === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        valEndParen = i;
        break;
      }
    }
  }

  const valStr = afterInsert.slice(valStartParen + 1, valEndParen);
  const rawVals = splitSqlValues(valStr);
  const parsedVals = rawVals.map(v => parseSqlValue(v));

  const row = {};
  cols.forEach((col, idx) => {
    row[col] = parsedVals[idx];
  });

  // Add auto-increment id if missing
  if (!row.id) {
    const maxId = tables[tblName].reduce((max, r) => Math.max(max, r.id || 0), 0);
    row.id = maxId + 1;
  }

  // Enforce unique constraints
  if (tblName === 'lots') {

    if (row.dispatched_qty === undefined) row.dispatched_qty = 0;
    if (row.return_qty === undefined) row.return_qty = 0;
    if (row.redispatch_qty === undefined) row.redispatch_qty = 0;

    const exists = tables.lots.some(r => r.lot_no === row.lot_no);
    if (exists) return;
  } else if (tblName === 'users') {
    const exists = tables.users.some(r => r.email === row.email || r.name === row.name);
    if (exists) return;
  } else if (tblName === 'clients') {
    const exists = tables.clients.some(r => r.name === row.name);
    if (exists) return;
  } else if (tblName === 'panels') {
    const exists = tables.panels.some(r => r.barcode === row.barcode);
    if (exists) return;
  }

  tables[tblName].push(row);
}

function initializeFallback() {
  console.log('----------------------------------------------------');
  console.log('⚠️  PostgreSQL is OFFLINE or UNREACHABLE.');
  console.log('🔄 ACTIVATING AUTO IN-MEMORY SQL DATABASE FALLBACK.');
  console.log('📁 Pre-seeding database from seed_new.sql...');
  console.log('----------------------------------------------------');

  const seedPath = path.join(__dirname, 'seed_new.sql');
  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    const lines = seedSql.split('\n');
    let insertCount = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      if (trimmed.startsWith('INSERT INTO ')) {
        try {
          parseInsertLine(trimmed);
          insertCount++;
        } catch (e) {
          // Silent catch for seeding robustness
        }
      }
    }
    console.log(`✅ Loaded seed data successfully: parsed ${insertCount} INSERT statements.`);
    console.log(`📊 In-memory stats:`);
    console.log(`   - Clients: ${tables.clients.length}`);
    console.log(`   - Users: ${tables.users.length}`);
    console.log(`   - Lots: ${tables.lots.length}`);
    console.log(`   - Panels: ${tables.panels.length}`);
    console.log(`   - Panel Logs: ${tables.panel_logs.length}`);
    console.log(`   - Defect Codes: ${tables.defect_codes.length}`);
    console.log('----------------------------------------------------');
  } else {
    console.log('⚠️  seed_new.sql not found! Running with empty database.');
  }
}

// Probe PostgreSQL connection
const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    useFallback = false;
    client.release();
    console.log('✅ Connected to local PostgreSQL database successfully.');
  } catch (err) {
    useFallback = true;
    initializeFallback();
  }
};

testDbConnection();

// --- High-Fidelity In-Memory SQL Query Router ---

export const runInMemoryQuery = async (text, params = [], userContext = null) => {
  const q = text.replace(/\s+/g, ' ').trim();

  // Swallow transaction and session directives safely
  if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK' || q.includes('SELECT set_config(')) {
    return { rows: [], rowCount: 1 };
  }

  // 1. Users table queries
  if (q.includes('SELECT * FROM users WHERE email =')) {
    const email = params[0].trim().toLowerCase();
    const user = tables.users.find(r => r.email.toLowerCase() === email && r.is_active !== false);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (q.includes('SELECT * FROM users WHERE id = $1 AND refresh_token = $2')) {
    const id = Number(params[0]);
    const token = params[1];
    const user = tables.users.find(r => r.id === id && r.refresh_token === token && r.is_active !== false);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (q.includes('UPDATE users SET refresh_token = $1 WHERE id = $2')) {
    const token = params[0];
    const id = Number(params[1]);
    const user = tables.users.find(r => r.id === id);
    if (user) {
      user.refresh_token = token;
    }
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  if (q.includes('UPDATE users SET refresh_token = NULL WHERE id = $1')) {
    const id = Number(params[0]);
    const user = tables.users.find(r => r.id === id);
    if (user) {
      user.refresh_token = null;
    }
    return { rows: [], rowCount: 1 };
  }

  if (q.includes("FROM users WHERE role = 'Employee'")) {
    const employees = tables.users.filter(r => r.role === 'Employee');
    if (q.includes('ORDER BY name ASC')) {
      employees.sort((a, b) => a.name.localeCompare(b.name));
    }
    return { rows: employees, rowCount: employees.length };
  }

  // 2. Clients table queries
  if (q.includes('SELECT * FROM clients')) {
    let clients = [...tables.clients];
    if (q.includes('ORDER BY name ASC')) {
      clients.sort((a, b) => a.name.localeCompare(b.name));
    }
    return { rows: clients, rowCount: clients.length };
  }

  if (q.includes('SELECT name FROM clients WHERE id =')) {
    const id = Number(params[0]);
    const client = tables.clients.find(r => r.id === id);
    return { rows: client ? [{ name: client.name }] : [], rowCount: client ? 1 : 0 };
  }

  if (q.includes('SELECT id FROM clients WHERE name =')) {
    const name = params[0];
    const client = tables.clients.find(r => r.name === name);
    return { rows: client ? [{ id: client.id }] : [], rowCount: client ? 1 : 0 };
  }

  if (q.includes('INSERT INTO clients') && q.includes('RETURNING id')) {
    const name = params[0];
    const existing = tables.clients.find(r => r.name === name);
    if (existing) {
      return { rows: [{ id: existing.id }], rowCount: 1 };
    }
    const newClient = {
      id: tables.clients.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
      name,
      contact: '',
      email: '',
      created_at: new Date().toISOString()
    };
    tables.clients.push(newClient);
    return { rows: [{ id: newClient.id }], rowCount: 1 };
  }

  // 3. Lots table queries
  if (q.startsWith('SELECT * FROM lots') || q.startsWith('SELECT lots.*')) {
    const idMatch = q.match(/WHERE id = \$(\d+)/i);
    const lotNoMatch = q.match(/WHERE lot_no = \$(\d+)/i);

    if (idMatch) {
      const idx = Number(idMatch[1]) - 1;
      const lot = tables.lots.find(r => r.id === Number(params[idx]));
      return { rows: lot ? [lot] : [], rowCount: lot ? 1 : 0 };
    }

    if (lotNoMatch) {
      const idx = Number(lotNoMatch[1]) - 1;
      const lot = tables.lots.find(r => r.lot_no === Number(params[idx]));
      return { rows: lot ? [lot] : [], rowCount: lot ? 1 : 0 };
    }

    // Dynamic Filter Engine
    let filtered = [...tables.lots];

    const clientIdxMatch = q.match(/client_id = \$(\d+)/i);
    if (clientIdxMatch) {
      const val = params[Number(clientIdxMatch[1]) - 1];
      filtered = filtered.filter(r => r.client_id === Number(val));
    }

    const statusIdxMatch = q.match(/status = \$(\d+)/i);
    if (statusIdxMatch) {
      const val = params[Number(statusIdxMatch[1]) - 1];
      filtered = filtered.filter(r => r.status === val);
    }

    const searchIdxMatch = q.match(/CAST\(lot_no AS VARCHAR\) LIKE \$(\d+)/i);
    if (searchIdxMatch) {
      const rawVal = params[Number(searchIdxMatch[1]) - 1];
      const val = rawVal.replace(/%/g, '').toLowerCase();
      filtered = filtered.filter(r =>
        String(r.lot_no).includes(val) ||
        (r.batch_no && r.batch_no.toLowerCase().includes(val))
      );
    }

    const startDateIdxMatch = q.match(/received_date >= \$(\d+)/i);
    if (startDateIdxMatch) {
      const val = params[Number(startDateIdxMatch[1]) - 1];
      filtered = filtered.filter(r => new Date(r.received_date) >= new Date(val));
    }

    const endDateIdxMatch = q.match(/received_date <= \$(\d+)/i);
    if (endDateIdxMatch) {
      const val = params[Number(endDateIdxMatch[1]) - 1];
      filtered = filtered.filter(r => new Date(r.received_date) <= new Date(val));
    }

    if (q.includes('ORDER BY received_date DESC')) {
      filtered.sort((a, b) => new Date(b.received_date) - new Date(a.received_date));
    }

    return { rows: filtered, rowCount: filtered.length };
  }

  if (q.includes('SELECT status FROM lots WHERE id =')) {
    const lot = tables.lots.find(r => r.id === Number(params[0]));
    return { rows: lot ? [{ status: lot.status }] : [], rowCount: lot ? 1 : 0 };
  }

  if (q.includes('SELECT id FROM lots WHERE lot_no =')) {
    const lot = tables.lots.find(r => r.lot_no === Number(params[0]));
    return { rows: lot ? [{ id: lot.id }] : [], rowCount: lot ? 1 : 0 };
  }

  if (q.includes('INSERT INTO lots') && q.includes('RETURNING *')) {
    const newLot = {
      id: tables.lots.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
      lot_no: Number(params[0]),
      batch_no: params[1],
      pixel_pitch: params[2],
      client_id: Number(params[3]),
      qty_sent: Number(params[4]),
      received_qty: Number(params[5]),
      dispatched_qty: 0,
      return_qty: 0,
      redispatch_qty: 0,
      received_date: new Date().toISOString().split('T')[0],
      status: 'In Process',
      remarks: params[6]
    };
    tables.lots.push(newLot);
    return { rows: [newLot], rowCount: 1 };
  }

  if (q.includes('UPDATE lots SET status =')) {
    let status, id;
    if (q.includes("status = 'Complete'")) {
      status = 'Complete';
      id = Number(params[0]);
    } else {
      status = params[0];
      id = Number(params[1]);
    }
    const lot = tables.lots.find(r => r.id === id);
    if (lot) {
      lot.status = status;
    }
    return { rows: lot ? [lot] : [], rowCount: lot ? 1 : 0 };
  }

  if (q.includes('UPDATE lots') && q.includes('dispatched_qty = dispatched_qty +')) {
    const qty = Number(params[0]);
    const id = Number(params[1]);
    const lot = tables.lots.find(r => r.id === id);
    if (lot) {
      lot.dispatched_qty = (lot.dispatched_qty || 0) + qty;
    }
    return { rows: lot ? [lot] : [], rowCount: lot ? 1 : 0 };
  }

  if (q.includes('UPDATE lots') && q.includes('return_qty = return_qty +')) {
    const qty = Number(params[0]);
    const id = Number(params[1]);
    const lot = tables.lots.find(r => r.id === id);
    if (lot) {
      lot.return_qty = (lot.return_qty || 0) + qty;
    }
    return { rows: lot ? [lot] : [], rowCount: lot ? 1 : 0 };
  }

  if (q.includes('UPDATE lots') && q.includes('redispatch_qty = redispatch_qty +')) {
    const qty = Number(params[0]);
    const id = Number(params[1]);
    const lot = tables.lots.find(r => r.id === id);
    if (lot) {
      lot.redispatch_qty = (lot.redispatch_qty || 0) + qty;
    }
    return { rows: lot ? [lot] : [], rowCount: lot ? 1 : 0 };
  }

  // 4. Lot transactions queries
  if (q.includes('INSERT INTO lot_transactions')) {
    const newTx = {
      id: tables.lot_transactions.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
      created_at: new Date().toISOString()
    };
    if (q.includes('qty')) {
      newTx.lot_id = Number(params[0]);
      newTx.transaction_type = params[1];
      newTx.qty = Number(params[2]);
      newTx.actor_id = Number(params[3]);
      newTx.remarks = params[4];
    } else {
      newTx.lot_id = Number(params[0]);
      newTx.transaction_type = params[1];
      newTx.qty = 0;
      newTx.actor_id = Number(params[2]);
      newTx.remarks = params[3];
    }
    tables.lot_transactions.push(newTx);
    return { rows: [newTx], rowCount: 1 };
  }

  if (q.includes('FROM lot_transactions t')) {
    const lotId = Number(params[0]);
    const txs = tables.lot_transactions.filter(r => r.lot_id === lotId);
    const enriched = txs.map(tx => {
      const user = tables.users.find(u => u.id === tx.actor_id);
      return {
        ...tx,
        actor_name: user ? user.name : 'System'
      };
    });
    enriched.sort((a, b) => b.id - a.id);
    return { rows: enriched, rowCount: enriched.length };
  }

  // 5. Panel logs and Telemetry queries
  if (q.includes('SELECT COUNT(*) FROM panels WHERE lot_id =') && q.includes('current_step = 14') && q.includes("status != 'Scrap'")) {
    const lotId = Number(params[0]);
    const count = tables.panels.filter(r => r.lot_id === lotId && r.current_step === 14 && r.status !== 'Scrap').length;
    return { rows: [{ count: String(count) }], rowCount: 1 };
  }

  if (q.includes('SELECT COUNT(*) FROM panels WHERE lot_id =') && q.includes("status = 'Scrap'")) {
    const lotId = Number(params[0]);
    const count = tables.panels.filter(r => r.lot_id === lotId && r.status === 'Scrap').length;
    return { rows: [{ count: String(count) }], rowCount: 1 };
  }

  if (q.includes('SELECT COUNT(*) FROM panels WHERE current_step =') && q.includes("status != 'Scrap'")) {
    const step = Number(params[0]);
    let filtered = tables.panels.filter(r => r.current_step === step && r.status !== 'Scrap');
    if (q.includes('lot_id = (SELECT id FROM lots WHERE lot_no =')) {
      const lotNo = Number(params[1]);
      const lot = tables.lots.find(r => r.lot_no === lotNo);
      if (lot) {
        filtered = filtered.filter(r => r.lot_id === lot.id);
      } else {
        filtered = [];
      }
    }
    return { rows: [{ count: String(filtered.length) }], rowCount: 1 };
  }

  if (q.includes('FROM panel_logs a JOIN repair_steps s')) {
    const trendMap = {};
    for (const log of tables.panel_logs) {
      const step = tables.repair_steps.find(s => s.id === log.step_id);
      const stepName = step ? step.name : 'Unknown';
      let dateStr = new Date().toISOString().split('T')[0];
      if (log.timestamp) {
        dateStr = String(log.timestamp).split('T')[0].split(' ')[0];
      }
      const key = `${dateStr}_${stepName}`;
      if (!trendMap[key]) {
        trendMap[key] = { date: dateStr, step_name: stepName, count: 0 };
      }
      trendMap[key].count++;
    }
    const trendList = Object.values(trendMap);
    trendList.sort((a, b) => b.date.localeCompare(a.date) || b.count - a.count);
    return { rows: trendList.slice(0, 30), rowCount: trendList.length };
  }

  // 6. Panels search & mapping
  if (q.includes('SELECT p.*, l.lot_no, l.batch_no, l.pixel_pitch, e.name as engineer_name FROM panels p')) {
    const enriched = tables.panels.map(p => {
      const lot = tables.lots.find(l => l.id === p.lot_id);
      const engineer = tables.users.find(u => u.id === p.assigned_engineer_id);
      return {
        ...p,
        lot_no: lot ? lot.lot_no : null,
        batch_no: lot ? lot.batch_no : null,
        pixel_pitch: lot ? lot.pixel_pitch : null,
        engineer_name: engineer ? engineer.name : 'Unassigned'
      };
    });
    enriched.sort((a, b) => b.id - a.id);
    return { rows: enriched, rowCount: enriched.length };
  }

  if (q.includes('SELECT a.*, s.name as step_name, e.name as engineer_name FROM panel_logs a')) {
    const panelId = Number(params[0]);
    const logs = tables.panel_logs.filter(r => r.panel_id === panelId);
    const enriched = logs.map(l => {
      const step = tables.repair_steps.find(s => s.id === l.step_id);
      const engineer = tables.users.find(u => u.id === l.engineer_id);
      return {
        ...l,
        step_name: step ? step.name : 'Unknown',
        engineer_name: engineer ? engineer.name : 'Unknown'
      };
    });
    enriched.sort((a, b) => b.id - a.id);
    return { rows: enriched, rowCount: enriched.length };
  }

  if (q.includes('SELECT pl.*, u.name as engineer_name FROM panel_logs pl')) {
    const enriched = tables.panel_logs.map(pl => {
      const engineer = tables.users.find(u => u.id === pl.engineer_id);
      return {
        ...pl,
        engineer_name: engineer ? engineer.name : 'Unknown'
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  if (q.includes('SELECT id FROM panels WHERE barcode =')) {
    const barcode = params[0];
    const panel = tables.panels.find(r => r.barcode === barcode);
    return { rows: panel ? [{ id: panel.id }] : [], rowCount: panel ? 1 : 0 };
  }

  if (q.includes('SELECT id FROM panels WHERE lot_id =') && q.includes('sr_no =')) {
    const lotId = Number(params[0]);
    const srNo = Number(params[1]);
    const panel = tables.panels.find(r => r.lot_id === lotId && r.sr_no === srNo);
    return { rows: panel ? [{ id: panel.id }] : [], rowCount: panel ? 1 : 0 };
  }

  if (q.includes('INSERT INTO panels') && q.includes('RETURNING *')) {
    const newPanel = {
      id: tables.panels.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
      lot_id: Number(params[0]),
      sr_no: Number(params[1]),
      side: params[2],
      barcode: params[3],
      status: params[4] || 'Repairable',
      current_step: Number(params[5] || 1),
      assigned_engineer_id: params[6] ? Number(params[6]) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tables.panels.push(newPanel);
    return { rows: [newPanel], rowCount: 1 };
  }

  if (q.includes('INSERT INTO panel_logs')) {
    let stepId = 1;
    let engineerId = null;
    let status = 'OK';
    let remark = '';
    let panelId = Number(params[0]);

    if (q.includes('(SELECT id FROM repair_steps WHERE step_no = $2)')) {
      const stepNo = Number(params[1]);
      const step = tables.repair_steps.find(s => s.step_no === stepNo);
      if (step) stepId = step.id;
      engineerId = Number(params[2]);
      status = params[3];
      remark = params[4];
    } else if (q.includes('(SELECT id FROM repair_steps WHERE step_no = 1)')) {
      const step = tables.repair_steps.find(s => s.step_no === 1);
      if (step) stepId = step.id;
      engineerId = Number(params[1]);
      status = 'OK';
      remark = 'Initial registration and panel assignment';
    }

    const newLog = {
      id: tables.panel_logs.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
      panel_id: panelId,
      step_id: stepId,
      engineer_id: engineerId,
      status,
      remark,
      timestamp: new Date().toISOString()
    };
    tables.panel_logs.push(newLog);
    return { rows: [newLog], rowCount: 1 };
  }

  if (q.includes('SELECT * FROM panels WHERE id =')) {
    const id = Number(params[0]);
    const panel = tables.panels.find(r => r.id === id);
    return { rows: panel ? [panel] : [], rowCount: panel ? 1 : 0 };
  }

  if (q.includes('UPDATE panels SET')) {
    const status = params[0];
    const currentStep = Number(params[1]);
    const engineerId = params[2] ? Number(params[2]) : null;
    const id = Number(params[3]);

    const panel = tables.panels.find(r => r.id === id);
    if (panel) {
      panel.status = status;
      panel.current_step = currentStep;
      panel.assigned_engineer_id = engineerId;
      panel.updated_at = new Date().toISOString();
    }
    return { rows: panel ? [panel] : [], rowCount: panel ? 1 : 0 };
  }

  // 7. Pending logs queries
  if (q.includes('SELECT id FROM pending_logs WHERE panel_id =') && q.includes("approval_status = 'Pending Team Lead'")) {
    const panelId = Number(params[0]);
    const log = tables.pending_logs.find(r => r.panel_id === panelId && r.approval_status === 'Pending Team Lead');
    return { rows: log ? [{ id: log.id }] : [], rowCount: log ? 1 : 0 };
  }

  if (q.includes('INSERT INTO pending_logs')) {
    const newLog = {
      id: tables.pending_logs.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1,
      panel_id: Number(params[0]),
      step_no: Number(params[1]),
      engineer_id: Number(params[2]),
      status: params[3],
      remark: params[4],
      approval_status: 'Pending Team Lead',
      created_at: new Date().toISOString()
    };
    tables.pending_logs.push(newLog);
    return { rows: [newLog], rowCount: 1 };
  }

  if (q.includes('SELECT * FROM pending_logs') || q.includes('SELECT pl.*')) {
    const enriched = tables.pending_logs.map(pl => {
      const panel = tables.panels.find(p => p.id === pl.panel_id);
      const engineer = tables.users.find(u => u.id === pl.engineer_id);
      const teamLead = pl.team_lead_id ? tables.users.find(u => u.id === pl.team_lead_id) : null;
      return {
        ...pl,
        barcode: panel ? panel.barcode : null,
        sr_no: panel ? panel.sr_no : null,
        side: panel ? panel.side : null,
        engineer_name: engineer ? engineer.name : 'Unknown',
        team_lead_name: teamLead ? teamLead.name : null
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  if (q.includes('UPDATE pending_logs SET approval_status =')) {
    const status = params[0];
    const approverOrReason = params[1];
    const id = Number(params[2]);

    const log = tables.pending_logs.find(r => r.id === id);
    if (log) {
      log.approval_status = status;
      if (status === 'Approved' && q.includes('manager_id')) {
        log.manager_id = Number(approverOrReason);
        log.manager_approved_at = new Date().toISOString();
      } else if (status === 'Pending Manager') {
        log.team_lead_id = Number(approverOrReason);
        log.team_lead_approved_at = new Date().toISOString();
      } else if (status === 'Rejected') {
        log.rejection_reason = approverOrReason;
      }
    }
    return { rows: log ? [log] : [], rowCount: log ? 1 : 0 };
  }

  if (q.includes('SELECT * FROM pending_logs WHERE id =')) {
    const id = Number(params[0]);
    const log = tables.pending_logs.find(r => r.id === id);
    return { rows: log ? [log] : [], rowCount: log ? 1 : 0 };
  }

  if (q.includes('SELECT id FROM pending_logs WHERE panel_id =') && q.includes('step_no =')) {
    const panelId = Number(params[0]);
    const stepNo = Number(params[1]);
    const log = tables.pending_logs.find(r => r.panel_id === panelId && r.step_no === stepNo);
    return { rows: log ? [{ id: log.id }] : [], rowCount: log ? 1 : 0 };
  }

  // 8. Defect codes
  if (q.includes('SELECT * FROM defect_codes')) {
    return { rows: tables.defect_codes, rowCount: tables.defect_codes.length };
  }

  // Fallback logging for safety
  console.log(`⚠️ UNHANDLED FALLBACK SQL: "${q}" | Params:`, params);
  return { rows: [], rowCount: 0 };
};

// --- Overlay pool methods for transparent client routing ---

const originalConnect = pool.connect;
const originalQuery = pool.query;

pool.connect = function (callback) {
  if (useFallback) {
    const mockClient = {
      query: async (text, params) => {
        return runInMemoryQuery(text, params);
      },
      release: () => { }
    };
    if (callback) {
      callback(null, mockClient, () => { });
      return;
    }
    return Promise.resolve(mockClient);
  } else {
    return originalConnect.call(pool, callback);
  }
};

pool.query = function (text, params, callback) {
  if (useFallback) {
    const p = runInMemoryQuery(text, params);
    if (callback) {
      p.then(res => callback(null, res)).catch(err => callback(err));
      return;
    }
    return p;
  } else {
    return originalQuery.call(pool, text, params, callback);
  }
};

export const query = async (text, params, userContext = null) => {
  if (useFallback) {
    return runInMemoryQuery(text, params, userContext);
  }

  if (!userContext) {
    return pool.query(text, params);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', '${userContext.id || ''}', true)`);
    await client.query(`SELECT set_config('app.current_user_role', '${userContext.role || ''}', true)`);
    const res = await client.query(text, params);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
