import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

type Database = ReturnType<typeof createDatabase>;

type Cache = {
  pool: Pool;
  db: Database;
};

const globalCache = globalThis as typeof globalThis & { invoiceLaneDb?: Cache };

export function getDb(): Database {
  if (!globalCache.invoiceLaneDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const pool = new Pool({ connectionString, max: 10 });
    globalCache.invoiceLaneDb = {
      pool,
      db: createDatabase(pool),
    };
  }
  return globalCache.invoiceLaneDb.db;
}

export async function closeDb(): Promise<void> {
  if (!globalCache.invoiceLaneDb) return;
  const pool = globalCache.invoiceLaneDb.pool;
  globalCache.invoiceLaneDb = undefined;
  await pool.end();
}
