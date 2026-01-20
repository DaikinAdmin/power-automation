import { getCategoriesByLocale } from '../src/helpers/db/queries';

async function testCategoriesAPI() {
  console.log('🧪 Testing Categories API...\n');

  // Test English
  console.log('📝 Testing English (en):');
  const enCategories = await getCategoriesByLocale('en');
  console.log(`  ✓ Found ${enCategories.length} categories`);
  if (enCategories.length > 0) {
    console.log(`  Sample: ${enCategories[0].name} (${enCategories[0].slug})`);
    console.log(`  Subcategories: ${enCategories[0].subCategories.length}`);
    if (enCategories[0].subCategories.length > 0) {
      console.log(`    - ${enCategories[0].subCategories[0].name} (${enCategories[0].subCategories[0].slug})`);
    }
  }

  // Test Ukrainian
  console.log('\n📝 Testing Ukrainian (ua):');
  const uaCategories = await getCategoriesByLocale('ua');
  console.log(`  ✓ Found ${uaCategories.length} categories`);
  if (uaCategories.length > 0) {
    console.log(`  Sample: ${uaCategories[0].name} (${uaCategories[0].slug})`);
    console.log(`  Subcategories: ${uaCategories[0].subCategories.length}`);
    if (uaCategories[0].subCategories.length > 0) {
      console.log(`    - ${uaCategories[0].subCategories[0].name} (${uaCategories[0].subCategories[0].slug})`);
    }
  }

  console.log('\n✅ Test completed!');
  process.exit(0);
}

testCategoriesAPI();
