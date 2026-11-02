import pg from 'pg';

pg.types.setTypeParser(20, (v) => parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => parseFloat(v));

const globalForPg = globalThis;

function getPool() {
  if (!process.env.PG_URL) {
    throw new Error('PG_URL environment variable is not defined');
  }

  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new pg.Pool({
      connectionString: process.env.PG_URL,
    });
  }

  return globalForPg.pgPool;
}

export async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

