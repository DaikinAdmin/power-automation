import pg from 'pg';

const { Pool } = pg;

async function checkSeededData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/postgres'
  });

  try {
    // Count total items
    const itemCount = await pool.query('SELECT COUNT(*) as count FROM item');
    console.log('✅ Total items in database:', itemCount.rows[0].count);

    // Count items in UA warehouse
    const warehouseItemCount = await pool.query(
      `SELECT COUNT(*) as count FROM item_price WHERE "warehouseId" = 'ua-main-warehouse-1765546233426'`
    );
    console.log('✅ Items assigned to UA warehouse:', warehouseItemCount.rows[0].count);

    // Sample items with details
    const sampleItems = await pool.query(
      `SELECT 
        i."articleId", 
        id."itemName", 
        ip.price, 
        ip.quantity 
      FROM item i
      JOIN item_price ip ON i."articleId" = ip."itemSlug"
      JOIN item_details id ON i."articleId" = id."itemSlug"
      WHERE ip."warehouseId" = 'ua-main-warehouse-1765546233426'
      LIMIT 5`
    );

    console.log('\n📦 Sample items:');
    sampleItems.rows.forEach((item) => {
      console.log(`  - ${item.articleId}: ${item.itemName}`);
      console.log(`    Price: ${item.price} UAH, Quantity: ${item.quantity}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkSeededData();
