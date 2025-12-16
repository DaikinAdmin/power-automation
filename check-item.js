const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5433/power_automation'
});

async function checkItem() {
  try {
    const result = await pool.query(
      'SELECT "articleId", slug, "isDisplayed", "brandSlug", "categorySlug" FROM item WHERE "articleId" = $1',
      ['R9F12116']
    );
    
    console.log('Item found:', result.rows.length > 0);
    console.log('Item data:', result.rows[0]);
    
    if (result.rows.length > 0) {
      // Check item details
      const detailsResult = await pool.query(
        'SELECT locale, "itemName", "itemSlug" FROM item_details WHERE "itemSlug" = $1',
        [result.rows[0].articleId]
      );
      console.log('\nItem details found:', detailsResult.rows.length);
      console.log('Details:', detailsResult.rows);
      
      // Check prices
      const pricesResult = await pool.query(
        'SELECT "warehouseId", price, quantity FROM item_price WHERE "itemSlug" = $1',
        [result.rows[0].articleId]
      );
      console.log('\nPrices found:', pricesResult.rows.length);
      console.log('Prices:', pricesResult.rows);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkItem();
