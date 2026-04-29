/**
 * reset-orders.js
 *
 * 1. Drops the "order" table (CASCADE — removes FK constraints on dependent tables)
 * 2. Recreates the "order" table exactly as defined in src/db/schema.ts
 * 3. Re-adds FK constraints that were dropped from dependent tables
 * 4. Seeds the table from exports/orders.json
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://postgres:admin@localhost:5433/pa-test';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to database.');

  try {
    await client.query('BEGIN');

    // ── 1. Drop the order table (CASCADE removes FK constraints on dependent tables) ──
    console.log('Dropping "order" table...');
    await client.query('DROP TABLE IF EXISTS "order" CASCADE');

    // ── 2. Recreate the order table as per schema ──────────────────────────────────
    console.log('Creating "order" table...');
    await client.query(`
      CREATE TABLE "order" (
        "id"          text                        PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        "userId"      text                        NOT NULL,
        "createdAt"   timestamp(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   timestamp(3)                NOT NULL,
        "currency"    text                        NOT NULL,
        "totalNet"    double precision            NOT NULL DEFAULT 0,
        "totalVat"    double precision            NOT NULL DEFAULT 0,
        "totalGross"  double precision            NOT NULL DEFAULT 0,
        "status"      "OrderStatus"               NOT NULL DEFAULT 'NEW',
        "deliveryId"  text,
        "lineItems"   jsonb,
        "comment"     text,
        "notes"       jsonb,
        CONSTRAINT "order_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "user"("id")
          ON UPDATE CASCADE ON DELETE CASCADE
      )
    `);

    // ── 3. Seed from exports/orders.json (before re-adding FKs on dependent tables) ─
    const ordersFile = path.join(__dirname, '..', 'exports', 'orders.json');
    if (!fs.existsSync(ordersFile)) {
      throw new Error(`exports/orders.json not found at ${ordersFile}`);
    }

    const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    console.log(`Seeding ${orders.length} orders...`);

    for (const o of orders) {
      await client.query(
        `INSERT INTO "order"
           ("id", "userId", "createdAt", "updatedAt", "currency",
            "totalNet", "totalVat", "totalGross", "status",
            "deliveryId", "lineItems", "comment", "notes")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT ("id") DO NOTHING`,
        [
          o.id,
          o.userId,
          o.createdAt,
          o.updatedAt,
          o.currency,
          o.totalNet    ?? 0,
          o.totalVat    ?? 0,
          o.totalGross  ?? 0,
          o.status      ?? 'NEW',
          o.deliveryId  ?? null,
          o.lineItems   != null ? JSON.stringify(o.lineItems) : null,
          o.comment     ?? null,
          o.notes       != null ? JSON.stringify(o.notes)     : null,
        ]
      );
    }

    // ── 4. Re-add FK constraints AFTER data is loaded ─────────────────────────────
    console.log('Re-adding FK constraints on dependent tables...');

    await client.query(`
      ALTER TABLE "messages"
        ADD CONSTRAINT "messages_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "order"("id")
        ON UPDATE CASCADE ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE "payment"
        ADD CONSTRAINT "payment_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "order"("id")
        ON UPDATE CASCADE ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE "_ItemToOrder"
        ADD CONSTRAINT "_ItemToOrder_B_fkey"
        FOREIGN KEY ("B") REFERENCES "order"("id")
        ON UPDATE CASCADE ON DELETE CASCADE
    `);

    await client.query('COMMIT');
    console.log(`Done. ${orders.length} orders inserted.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error — rolled back transaction:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
