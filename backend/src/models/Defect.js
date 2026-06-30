import pool, { isFallback } from '../config/db.js';
import * as memoryDb from '../services/memoryDb.js';

export const Defect = {
  async getAll() {
    if (isFallback()) {
      return memoryDb.getAllDefectCodes();
    }
    const res = await pool.query('SELECT * FROM defect_codes');
    return res.rows;
  }
};
