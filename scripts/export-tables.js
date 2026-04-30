const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://postgres:admin@localhost:5433/pa-test';

async function exportTable(client, tableName, outputFile) {
  try {
    const res = await client.query(`SELECT * FROM "${tableName}"`);
    fs.writeFileSync(outputFile, JSON.stringify(res.rows, null, 2), 'utf8');
    console.log(`${tableName}: ${res.rows.length} rows -> ${outputFile}`);
  } catch (err) {
    console.error(`Error exporting ${tableName}: ${err.message}`);
  }
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const outDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  await exportTable(client, 'order', path.join(outDir, 'orders.json'));
  await exportTable(client, 'payment', path.join(outDir, 'payments.json'));
  await exportTable(client, 'delivery', path.join(outDir, 'delivery.json'));

  await client.end();
  console.log('Done.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
