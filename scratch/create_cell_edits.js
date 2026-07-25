import pool from '../backend/src/config/db.js';

const run = async () => {
  try {
    console.log("Creating cell_edits table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cell_edits (
        id SERIAL PRIMARY KEY,
        lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
        sheet_name VARCHAR(255) NOT NULL,
        row_idx INTEGER NOT NULL,
        col_idx VARCHAR(50) NOT NULL,
        value TEXT,
        UNIQUE(lot_id, sheet_name, row_idx, col_idx)
      );
    `);
    console.log("cell_edits table created successfully!");
  } catch (err) {
    console.error("Failed to create table:", err);
  } finally {
    pool.end();
  }
};

run();
