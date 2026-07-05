import pool, { isFallback, query } from '../config/db.js';
import { Panel } from '../models/Panel.js';
import { Lot } from '../models/Lot.js';
import { PendingLog } from '../models/PendingLog.js';
import * as memoryDb from '../services/memoryDb.js';

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

export const getPanels = async (req, res) => {
  const { step_no } = req.query;

  try {
    const filters = {};
    if (step_no) {
      filters.step_no = parseInt(step_no);
    }
    filters.notStatus = 'Scrap';

    // RLS Context scoped via req.user passed to model
    const list = await Panel.getAll(filters, req.user);
    res.json(list);
  } catch (err) {
    console.error('Fetch panels error:', err);
    res.status(500).json({ error: "Failed to fetch panels." });
  }
};

export const searchPanel = async (req, res) => {
  const { barcode, sr_no, lot_no } = req.query;

  try {
    let panel = null;

    if (isFallback()) {
      if (barcode) {
        panel = memoryDb.findPanelByBarcode(barcode);
      } else if (sr_no && lot_no) {
        const lot = memoryDb.findLotByLotNo(Number(lot_no));
        if (lot) {
          panel = memoryDb.findPanelByLotAndSrNo(lot.id, Number(sr_no));
        }
      }
      if (panel) {
        const lot = memoryDb.findLotById(panel.lot_id);
        const eng = memoryDb.findUserByIdAndRefreshToken(panel.assigned_engineer_id, panel.refresh_token) || memoryDb.tables.users.find(u => u.id === panel.assigned_engineer_id);
        panel = {
          ...panel,
          lot_no: lot ? lot.lot_no : null,
          batch_no: lot ? lot.batch_no : null,
          pixel_pitch: lot ? lot.pixel_pitch : null,
          engineer_name: eng ? eng.name : 'Unassigned'
        };
      }
    } else {
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
      }
      if (panelRes && panelRes.rowCount > 0) {
        panel = panelRes.rows[0];
      }
    }

    if (!panel) {
      return res.status(404).json({ error: "Panel not found." });
    }

    // 1. Fetch panel log activities
    let activities = [];
    if (isFallback()) {
      activities = memoryDb.getPanelLogs(panel.id);
      // Sort activities step_no ASC, timestamp ASC matching standard SQL ORDER BY
      activities.sort((a, b) => {
        const stepA = memoryDb.tables.repair_steps.find(s => s.id === a.step_id)?.step_no || 0;
        const stepB = memoryDb.tables.repair_steps.find(s => s.id === b.step_id)?.step_no || 0;
        return stepA - stepB || new Date(a.timestamp) - new Date(b.timestamp);
      });
    } else {
      const actRes = await query(`
        SELECT a.*, s.name as step_name, e.name as engineer_name 
        FROM panel_logs a
        JOIN repair_steps s ON a.step_id = s.id
        LEFT JOIN users e ON a.engineer_id = e.id
        WHERE a.panel_id = $1
        ORDER BY s.step_no ASC, a.timestamp ASC
      `, [panel.id], req.user);
      activities = actRes.rows;
    }

    // 2. Fetch pending log details
    let isLocked = false;
    let pendingInfo = null;
    let reworkInfo = null;

    if (isFallback()) {
      const pLog = memoryDb.tables.pending_logs
        .filter(pl => pl.panel_id === panel.id && ['Pending Team Lead', 'Pending Manager', 'Rejected'].includes(pl.approval_status))
        .sort((a, b) => b.id - a.id)[0];
        
      if (pLog) {
        const eng = memoryDb.tables.users.find(u => u.id === pLog.engineer_id);
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
            engineer_name: eng ? eng.name : 'Unknown'
          };
        }
      }
    } else {
      const pendingRes = await query(`
        SELECT pl.*, u.name as engineer_name 
        FROM pending_logs pl
        JOIN users u ON pl.engineer_id = u.id
        WHERE pl.panel_id = $1 AND pl.approval_status IN ('Pending Team Lead', 'Pending Manager', 'Rejected')
        ORDER BY pl.id DESC LIMIT 1
      `, [panel.id], req.user);

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
    }

    res.json({
      panel,
      activities,
      is_locked: isLocked,
      pending_info: pendingInfo,
      rework_info: reworkInfo
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: "Failed to search panel." });
  }
};

export const assignPanel = async (req, res) => {
  const { lot_no, sr_no, side, engineer_id } = req.body;

  if (!lot_no || !sr_no || !side || !engineer_id) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const useTx = !isFallback();
  const txClient = useTx ? await pool.connect() : null;

  try {
    if (useTx) await txClient.query('BEGIN');

    // Fetch lot
    const lot = await Lot.findByLotNo(lot_no, txClient);
    if (!lot) {
      if (useTx) {
        await txClient.query('ROLLBACK');
        txClient.release();
      }
      return res.status(404).json({ error: `Lot number ${lot_no} does not exist.` });
    }

    // Barcode generation formula
    const pitchStr = lot.pixel_pitch.replace('.', '');
    const sideChar = side[0];
    const srStr = String(sr_no).padStart(4, '0');
    const barcode = `ESRP2${pitchStr}${lot.lot_no}E26${lot.batch_no}${sideChar}${srStr}`;

    // Validate duplicate barcode
    const checkBarcode = await Panel.findByBarcode(barcode);
    if (checkBarcode) {
      if (useTx) {
        await txClient.query('ROLLBACK');
        txClient.release();
      }
      return res.status(400).json({ error: `Barcode ${barcode} already exists.` });
    }

    // Validate duplicate serial
    const checkSerial = await Panel.findByLotAndSrNo(lot.id, sr_no);
    if (checkSerial) {
      if (useTx) {
        await txClient.query('ROLLBACK');
        txClient.release();
      }
      return res.status(400).json({ error: `Serial number ${sr_no} has already been registered in Lot ${lot_no}.` });
    }

    // Insert new panel
    const newPanel = await Panel.create({
      lot_id: lot.id,
      sr_no,
      side,
      barcode,
      status: 'Repairable',
      current_step: 1,
      assigned_engineer_id: engineer_id
    }, txClient);

    // Log Step 1 activity
    await Panel.createLog({
      panel_id: newPanel.id,
      step_no: 1,
      engineer_id,
      status: 'OK',
      remark: 'Initial registration and panel assignment'
    }, txClient);

    if (useTx) {
      await txClient.query('COMMIT');
      txClient.release();
    }

    res.status(201).json({ panel: newPanel, barcode });

  } catch (err) {
    if (useTx && txClient) {
      await txClient.query('ROLLBACK');
      txClient.release();
    }
    console.error('Assign error:', err);
    res.status(500).json({ error: "Failed to register panel." });
  }
};

export const progressRepair = async (req, res) => {
  const { panel_id, engineer_id, status, remark } = req.body;

  if (!panel_id || !engineer_id || !status) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const panel = await Panel.findById(panel_id);
    if (!panel) {
      return res.status(404).json({ error: "Panel not found." });
    }

    if (panel.status === 'Scrap') {
      return res.status(400).json({ error: "Cannot process a scrapped panel." });
    }
    if (panel.current_step === 12) {
      return res.status(400).json({ error: "Panel is already fully dispatched." });
    }

    // Check if there is already an active pending approval entry
    const activePending = await PendingLog.findPendingByPanel(panel_id);
    if (activePending) {
      return res.status(400).json({ error: "This panel already has a pending clearance approval." });
    }

    // RBAC check: Employees can only progress panels assigned to them
    if (req.user.role === 'Employee' && panel.assigned_engineer_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only update panels assigned to you." });
    }

    const currentStepNo = panel.current_step;

    // 2-Tier Quality Clearance Workflow: Employee entries go to pending_logs (temp db)
    if (req.user.role === 'Employee') {
      await PendingLog.create({
        panel_id,
        step_no: currentStepNo,
        engineer_id: req.user.id,
        status,
        remark: remark || ''
      });

      return res.json({
        success: true,
        pending: true,
        message: "Work logged successfully. Awaiting Team Lead clearance approval."
      });
    }

    // Admins, Managers, and Team Leads bypass approvals when logging directly
    let nextStepNo = currentStepNo;
    let nextStatus = panel.status;

    const useTx = !isFallback();
    const txClient = useTx ? await pool.connect() : null;

    try {
      if (useTx) await txClient.query('BEGIN');

      if (status === 'Scrap') {
        nextStatus = 'Scrap';
        const scrapReason = remark || 'Scrapped during repair';

        // Update panel status to Scrap
        if (useTx) {
          await txClient.query(`
            UPDATE panels 
            SET status = $1, scrap_reason = $2, assigned_engineer_id = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [nextStatus, scrapReason, engineer_id, panel_id]);
        } else {
          const p = memoryDb.tables.panels.find(p => p.id === panel_id);
          if (p) {
            p.status = nextStatus;
            p.scrap_reason = scrapReason;
            p.assigned_engineer_id = engineer_id;
            p.updated_at = new Date().toISOString();
          }
        }

        // Log Step Scrap
        await Panel.createLog({
          panel_id,
          step_no: currentStepNo,
          engineer_id,
          status: 'Scrap',
          remark: scrapReason
        }, txClient);

      } else if (status === 'Faulty') {
        // Re-assign to engineer for rework
        if (useTx) {
          await txClient.query(`
            UPDATE panels 
            SET assigned_engineer_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [engineer_id, panel_id]);
        } else {
          const p = memoryDb.tables.panels.find(p => p.id === panel_id);
          if (p) {
            p.assigned_engineer_id = engineer_id;
            p.updated_at = new Date().toISOString();
          }
        }

        // Log Step Faulty
        await Panel.createLog({
          panel_id,
          step_no: currentStepNo,
          engineer_id,
          status: 'Faulty',
          remark: remark || 'Failed test, sent for rework'
        }, txClient);

      } else if (status === 'OK') {
        nextStepNo = currentStepNo + 1;

        // Progress panel current_step
        if (useTx) {
          await txClient.query(`
            UPDATE panels 
            SET current_step = $1, assigned_engineer_id = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [nextStepNo, engineer_id, panel_id]);
        } else {
          const p = memoryDb.tables.panels.find(p => p.id === panel_id);
          if (p) {
            p.current_step = nextStepNo;
            p.assigned_engineer_id = engineer_id;
            p.updated_at = new Date().toISOString();
          }
        }

        // Log Step OK
        await Panel.createLog({
          panel_id,
          step_no: currentStepNo,
          engineer_id,
          status: 'OK',
          remark: remark || `Successfully completed step ${STEP_NAMES[currentStepNo - 1]}`
        }, txClient);
      }

      if (useTx) {
        await txClient.query('COMMIT');
        txClient.release();
      }

      res.json({
        success: true,
        current_step: nextStepNo,
        status: nextStatus
      });

    } catch (err) {
      if (useTx && txClient) {
        await txClient.query('ROLLBACK');
        txClient.release();
      }
      throw err;
    }

  } catch (err) {
    console.error('Repair transition error:', err);
    res.status(500).json({ error: "Failed to progress panel in repair." });
  }
};
