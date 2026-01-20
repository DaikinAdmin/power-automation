import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { subcategories } from '../src/db/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/postgres'
});
const db = drizzle(pool);

async function verifySubcategories() {
  const rows = await db.select().from(subcategories).limit(15);
  console.log(`\n✅ Found ${rows.length} subcategories in database:`);
  rows.forEach(r => console.log(`   - ${r.slug} (${r.name})`));
  await pool.end();
}

verifySubcategories().catch(console.error);
