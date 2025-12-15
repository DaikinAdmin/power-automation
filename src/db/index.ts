import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/postgres',
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export const db = drizzle(pool, { logger: true });