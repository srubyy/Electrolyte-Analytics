import pool, { isFallback, query } from '../config/db.js';
import { PendingLog } from '../models/PendingLog.js';
import { Panel } from '../models/Panel.js';
import { RepairStep } from '../models/RepairStep.js';
import * as memoryDb from '../services/memoryDb.js';

export const getApprovals = async (req, res) => {
  try {
    let approvals = [];
    if (isFallback()) {
      approvals = memoryDb.getAllPendingLogs()
        .filter(row => row.approval_status === 'Pending Team Lead')
        .sort((a, b) => a.id - b.id);
    } else {
      const approvalsRes = await query(`
        SELECT pl.*, p.barcode, p.sr_no, p.side, u.name as engineer_name, tl.name as team_lead_name, l.lot_no, l.client_id
        FROM pending_logs pl
        JOIN panels p ON pl.panel_id = p.id
        JOIN lots l ON p.lot_id = l.id
        JOIN users u ON pl.engineer_id = u.id
        LEFT JOIN users tl ON pl.team_lead_id = tl.id
        WHERE pl.approval_status = 'Pending Team Lead'
        ORDER BY pl.id ASC
      `, [], req.user);
      approvals = approvalsRes.rows;
    }

    const stepsMap = {};
    for (const row of approvals) {
      let clientId = null;
      if (isFallback()) {
        const panel = memoryDb.findPanelById(row.panel_id);
        const lot = panel ? memoryDb.findLotById(panel.lot_id) : null;
        if (lot) clientId = lot.client_id;
      } else {
        clientId = row.client_id;
      }

      if (clientId && !stepsMap[clientId]) {
        stepsMap[clientId] = await RepairStep.getAllForClient(clientId);
      }
    }
    stepsMap['default'] = await RepairStep.getAllForClient(null);

    const result = approvals.map(row => {
      let clientId = null;
      if (isFallback()) {
        const panel = memoryDb.findPanelById(row.panel_id);
        const lot = panel ? memoryDb.findLotById(panel.lot_id) : null;
        if (lot) clientId = lot.client_id;
      } else {
        clientId = row.client_id;
      }

      const clientSteps = stepsMap[clientId] || stepsMap['default'];
      const stepObj = clientSteps.find(s => s.step_no === row.step_no);
      const step_name = stepObj ? stepObj.name : `Step ${row.step_no}`;

      return {
        ...row,
        step_name
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Approvals fetch error:', err);
    res.status(500).json({ error: "Failed to fetch approvals." });
  }
};

export const tlApprove = async (req, res) => {
  const { pending_log_id } = req.body;
  if (!pending_log_id) {
    return res.status(400).json({ error: "Missing pending_log_id." });
  }

  const useTx = !isFallback();
  const txClient = useTx ? await pool.connect() : null;

  try {
    if (useTx) await txClient.query('BEGIN');

    // Fetch pending log details
    let pLog = null;
    if (isFallback()) {
      pLog = memoryDb.tables.pending_logs.find(pl => pl.id === Number(pending_log_id) && pl.approval_status === 'Pending Team Lead');
    } else {
      const logRes = await txClient.query(`
        SELECT * FROM pending_logs 
        WHERE id = $1 AND approval_status = 'Pending Team Lead'
      `, [pending_log_id]);
      if (logRes.rowCount > 0) pLog = logRes.rows[0];
    }

    if (!pLog) {
      if (useTx) {
        await txClient.query('ROLLBACK');
        txClient.release();
      }
      return res.status(404).json({ error: "Pending approval log not found or already committed." });
    }

    // 1. Insert into committed panel_logs
    await Panel.createLog({
      panel_id: pLog.panel_id,
      step_no: pLog.step_no,
      engineer_id: pLog.engineer_id,
      status: pLog.status,
      remark: pLog.remark
    }, txClient);

    // 2. Update panel state depending on verdict
    let nextStepNo = pLog.step_no;
    let nextStatus = 'Repairable';
    let scrapReason = null;

    if (pLog.status === 'Scrap') {
      nextStatus = 'Scrap';
      scrapReason = pLog.remark || 'Scrapped during repair';

      if (useTx) {
        await txClient.query(`
          UPDATE panels 
          SET status = $1, scrap_reason = $2, assigned_engineer_id = $3, updated_at = NOW()
          WHERE id = $4
        `, [nextStatus, scrapReason, pLog.engineer_id, pLog.panel_id]);
      } else {
        const p = memoryDb.tables.panels.find(p => p.id === pLog.panel_id);
        if (p) {
          p.status = nextStatus;
          p.scrap_reason = scrapReason;
          p.assigned_engineer_id = pLog.engineer_id;
          p.updated_at = new Date().toISOString();
        }
      }
    } else if (pLog.status === 'Faulty') {
      if (useTx) {
        await txClient.query(`
          UPDATE panels 
          SET assigned_engineer_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [pLog.engineer_id, pLog.panel_id]);
      } else {
        const p = memoryDb.tables.panels.find(p => p.id === pLog.panel_id);
        if (p) {
          p.assigned_engineer_id = pLog.engineer_id;
          p.updated_at = new Date().toISOString();
        }
      }
    } else if (pLog.status === 'OK') {
      nextStepNo = pLog.step_no + 1;

      if (useTx) {
        await txClient.query(`
          UPDATE panels 
          SET current_step = $1, assigned_engineer_id = $2, updated_at = NOW()
          WHERE id = $3
        `, [nextStepNo, pLog.engineer_id, pLog.panel_id]);
      } else {
        const p = memoryDb.tables.panels.find(p => p.id === pLog.panel_id);
        if (p) {
          p.current_step = nextStepNo;
          p.assigned_engineer_id = pLog.engineer_id;
          p.updated_at = new Date().toISOString();
        }
      }
    }

    // 3. Mark pending log as Approved by Team Lead
    if (isFallback()) {
      pLog.approval_status = 'Approved';
      pLog.team_lead_id = req.user.id;
      pLog.team_lead_approved_at = new Date().toISOString();
    } else {
      await txClient.query(`
        UPDATE pending_logs 
        SET approval_status = 'Approved', team_lead_id = $1, team_lead_approved_at = NOW()
        WHERE id = $2
      `, [req.user.id, pending_log_id]);
    }

    if (useTx) {
      await txClient.query('COMMIT');
      txClient.release();
    }

    res.json({ success: true, current_step: nextStepNo, status: nextStatus });

  } catch (err) {
    if (useTx && txClient) {
      await txClient.query('ROLLBACK');
      txClient.release();
    }
    console.error('TL approve error:', err);
    res.status(500).json({ error: "Failed to finalize quality clearance transaction." });
  }
};

export const rejectLog = async (req, res) => {
  const { pending_log_id, rejection_reason } = req.body;
  if (!pending_log_id || !rejection_reason) {
    return res.status(400).json({ error: "Pending log ID and rejection reason are required." });
  }

  try {
    const expectedStatus = 'Pending Team Lead';

    if (isFallback()) {
      const log = memoryDb.tables.pending_logs.find(pl => pl.id === Number(pending_log_id) && pl.approval_status === expectedStatus);
      if (!log) {
        return res.status(404).json({ error: "Pending approval log not found or already processed." });
      }
      memoryDb.updatePendingLogStatus(log.id, 'Rejected', req.user.id, 'teamlead', rejection_reason);
      return res.json({ success: true, log });
    }

    const updateRes = await query(`
      UPDATE pending_logs 
      SET approval_status = 'Rejected', rejection_reason = $1
      WHERE id = $2 AND approval_status = $3
      RETURNING *
    `, [rejection_reason, pending_log_id, expectedStatus], req.user);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending approval log not found or already processed." });
    }

    res.json({ success: true, log: updateRes.rows[0] });
  } catch (err) {
    console.error('Rejection error:', err);
    res.status(500).json({ error: "Server error during log rejection." });
  }
};
