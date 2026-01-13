import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function fixPageContent() {
  console.log('Checking and fixing page content structure...');

  const pages = await db.select().from(schema.pageContent);

  for (const page of pages) {
    try {
      let content;
      if (typeof page.content === 'string') {
        content = JSON.parse(page.content);
      } else {
        content = page.content;
      }

      console.log(`\nPage ID ${page.id} (${page.slug}/${page.locale}):`);
      console.log('Content keys:', Object.keys(content));

      let needsUpdate = false;
      let fixedContent = content;

      // Check if content has wrong structure
      if (!content.blocks || !Array.isArray(content.blocks)) {
        console.log('  ❌ Missing or invalid blocks array');
        
        // Check if it's double-wrapped
        if (content.content && content.content.blocks) {
          console.log('  🔧 Fixing double-wrapped content');
          fixedContent = content.content;
          needsUpdate = true;
        } else if (content.time && content.version) {
          // Has EditorJS metadata but no blocks - probably corrupted
          console.log('  🔧 Has EditorJS metadata but no blocks - creating empty blocks');
          fixedContent = { ...content, blocks: [] };
          needsUpdate = true;
        } else {
          console.log('  🔧 Creating new empty EditorJS structure');
          fixedContent = { blocks: [], time: Date.now(), version: '2.28.0' };
          needsUpdate = true;
        }
      } else {
        console.log(`  ✓ Valid structure with ${content.blocks.length} blocks`);
      }

      if (needsUpdate) {
        await db
          .update(schema.pageContent)
          .set({ content: JSON.stringify(fixedContent) })
          .where(eq(schema.pageContent.id, page.id));
        
        console.log('  ✅ Updated successfully');
      }
    } catch (error) {
      console.error(`  ❌ Error processing page ${page.id}:`, error);
    }
  }

  console.log('\n✅ Done!');
  process.exit(0);
}

fixPageContent().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
