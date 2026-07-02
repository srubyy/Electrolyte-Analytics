import pool, { isFallback } from '../config/db.js';
import * as memoryDb from '../services/memoryDb.js';

export const Transaction = {
  async create(tx, clientTransaction = null) {
    const db = clientTransaction || pool;
    if (isFallback()) {
      return memoryDb.createTransaction(tx);
    }
    
    let sql = `
      INSERT INTO lot_transactions (lot_id, transaction_type, qty, actor_id, remarks) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const params = [tx.lot_id, tx.transaction_type, tx.qty || 0, tx.actor_id, tx.remarks];
    
    const res = await db.query(sql, params);
    return res.rows[0];
  },

  async getByLotId(lotId) {
    if (isFallback()) {
      return memoryDb.getTransactionsByLotId(Number(lotId));
    }
    
    const sql = `
      SELECT t.*, u.name as actor_name 
      FROM lot_transactions t
      LEFT JOIN users u ON t.actor_id = u.id
      WHERE t.lot_id = $1
      ORDER BY t.created_at DESC
    `;
    
    const res = await pool.query(sql, [lotId]);
    return res.rows;
  }
};
