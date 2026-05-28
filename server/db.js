import pg from 'pg';

const { Pool } = pg;

// Create connection pool to electrolyte_db
const pool = new Pool({
  database: 'electrolyte_db',
  host: 'localhost',
  port: 5432,
  // Using default Homebrew peer authentication (no password required)
});

export const query = async (text, params, userContext = null) => {
  if (!userContext) {
    // Normal system query
    return pool.query(text, params);
  }

  // Scoped query with session settings inside a transaction for RLS
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
