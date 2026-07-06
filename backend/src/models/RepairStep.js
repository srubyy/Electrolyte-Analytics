import pool, { isFallback } from '../config/db.js';
import * as memoryDb from '../services/memoryDb.js';

export const RepairStep = {
  async getAllForClient(clientId, clientTransaction = null) {
    const db = clientTransaction || pool;
    if (isFallback()) {
      return memoryDb.getStepsForClient(clientId);
    }
    
    let res;
    if (clientId) {
      res = await db.query(
        'SELECT * FROM repair_steps WHERE client_id = $1 ORDER BY step_no ASC',
        [clientId]
      );
    }
    
    // If no client-specific steps are found, fetch the global default steps
    if (!res || res.rows.length === 0) {
      res = await db.query(
        'SELECT * FROM repair_steps WHERE client_id IS NULL ORDER BY step_no ASC'
      );
    }
    
    return res.rows;
  },

  async saveCustomSteps(clientId, steps, clientTransaction = null) {
    const db = clientTransaction || pool;
    if (isFallback()) {
      return memoryDb.saveStepsForClient(clientId, steps);
    }
    
    // Deletes existing client-specific steps and bulk inserts new ones
    await db.query('DELETE FROM repair_steps WHERE client_id = $1', [clientId]);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNo = step.step_no || (i + 1);
      await db.query(
        'INSERT INTO repair_steps (client_id, step_no, name) VALUES ($1, $2, $3)',
        [clientId, stepNo, step.name]
      );
    }
    
    return true;
  }
};
