import pool, { isFallback } from '../config/db.js';
import * as memoryDb from '../services/memoryDb.js';

export const Client = {
  async getAll() {
    if (isFallback()) {
      const list = memoryDb.getAllClients();
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    const res = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    return res.rows;
  },

  async findById(id, clientTransaction = null) {
    const db = clientTransaction || pool;
    if (isFallback()) {
      return memoryDb.findClientById(Number(id));
    }
    const res = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findByName(name, clientTransaction = null) {
    const db = clientTransaction || pool;
    if (isFallback()) {
      return memoryDb.findClientByName(name);
    }
    const res = await db.query('SELECT * FROM clients WHERE name = $1', [name]);
    return res.rows[0] || null;
  },

  async create(name, clientTransaction = null) {
    const db = clientTransaction || pool;
    if (isFallback()) {
      return memoryDb.createClient(name);
    }
    const res = await db.query('INSERT INTO clients (name) VALUES ($1) RETURNING *', [name]);
    return res.rows[0];
  }
};
