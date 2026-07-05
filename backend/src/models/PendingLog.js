import pool, { isFallback } from '../config/db.js';
import * as memoryDb from '../services/memoryDb.js';

export const PendingLog = {
  async findPendingByPanel(panelId) {
    if (isFallback()) {
      return memoryDb.findPendingLogByPanelAndStatus(Number(panelId), 'Pending Team Lead');
    }
    const res = await pool.query(
      "SELECT id FROM pending_logs WHERE panel_id = $1 AND approval_status = 'Pending Team Lead'",
      [panelId]
    );
    return res.rows[0] || null;
  },

  async findPendingByPanelAndStep(panelId, stepNo) {
    if (isFallback()) {
      return memoryDb.findPendingLogByPanelAndStep(Number(panelId), Number(stepNo));
    }
    const res = await pool.query(
      "SELECT id FROM pending_logs WHERE panel_id = $1 AND step_no = $2",
      [panelId, stepNo]
    );
    return res.rows[0] || null;
  },

  async create(log) {
    if (isFallback()) {
      return memoryDb.createPendingLog(log);
    }
    const res = await pool.query(
      `INSERT INTO pending_logs (panel_id, step_no, engineer_id, status, remark, approval_status) 
       VALUES ($1, $2, $3, $4, $5, 'Pending Team Lead') 
       RETURNING *`,
      [log.panel_id, log.step_no, log.engineer_id, log.status, log.remark]
    );
    return res.rows[0];
  },

  async getAll() {
    if (isFallback()) {
      return memoryDb.getAllPendingLogs();
    }
    
    const sql = `
      SELECT pl.*, p.barcode, p.sr_no, p.side, u.name as engineer_name, tl.name as team_lead_name
      FROM pending_logs pl
      JOIN panels p ON pl.panel_id = p.id
      JOIN users u ON pl.engineer_id = u.id
      LEFT JOIN users tl ON pl.team_lead_id = tl.id
      ORDER BY pl.created_at DESC
    `;
    
    const res = await pool.query(sql);
    return res.rows;
  },

  async updateStatus(id, status, approverId, approverType, rejectionReason = '') {
    if (isFallback()) {
      return memoryDb.updatePendingLogStatus(Number(id), status, approverId ? Number(approverId) : null, approverType, rejectionReason);
    }
    
    let sql = 'UPDATE pending_logs SET approval_status = $1';
    const params = [status];
    
    if (status === 'Approved' && approverType === 'teamlead') {
      params.push(approverId);
      sql += `, team_lead_id = $${params.length}, team_lead_approved_at = CURRENT_TIMESTAMP`;
    } else if (status === 'Rejected') {
      params.push(rejectionReason);
      sql += `, rejection_reason = $${params.length}`;
    }
    
    params.push(id);
    sql += ` WHERE id = $${params.length} RETURNING *`;
    
    const res = await pool.query(sql, params);
    return res.rows[0];
  },

  async findById(id) {
    if (isFallback()) {
      return memoryDb.findPendingLogById(Number(id));
    }
    const res = await pool.query('SELECT * FROM pending_logs WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
};
