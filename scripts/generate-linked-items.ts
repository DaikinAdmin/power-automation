/**
 * Generates "related products" for every item in the catalog using the
 * Gemini API and stores them in the `linked_items` table (see src/db/schema.ts).
 * The product page reads that table through
 * /api/public/items/[locale]/[slug]/related to render the related-products
 * carousel (src/components/product/related-products-carousel.tsx).
 *
 * Why chunking instead of one Gemini call per article:
 * Calling the API once per SKU (800+ calls) would burn through rate limits
 * fast and mostly re-send the same catalog context over and over. Instead,
 * items are sorted by category/brand and split into chunks (default 40
 * items). One Gemini call analyzes a whole chunk at once and returns
 * relations for every item in it, cut down the call count by ~40x while
 * keeping candidates thematically close (same/neighbouring category).
 *
 * Usage (run from project root):
 *   npx tsx scripts/generate-linked-items.ts                  # whole catalog
 *   npx tsx scripts/generate-linked-items.ts --limit=200       # first batch
 *   npx tsx scripts/generate-linked-items.ts --offset=200 --limit=200   # next batch
 *   npx tsx scripts/generate-linked-items.ts --category=protection-equipment
 *   npx tsx scripts/generate-linked-items.ts --dry-run          # preview only
 *   npx tsx scripts/generate-linked-items.ts --force             # recompute existing links
 *
 * Flags:
 *   --limit=N            process at most N items (after sorting)
 *   --offset=N           skip the first N items (combine with --limit for manual batching)
 *   --category=slug      only process items whose categorySlug matches exactly
 *   --chunk-size=N        items per Gemini call (default 40)
 *   --delay-ms=N          delay between Gemini calls (default 4000 = 15 req/min)
 *   --related-count=N     max related items stored per product (default 8)
 *   --locale=xx            item details locale used for the prompt text (default "ua")
 *   --model=name           Gemini model id (default env GEMINI_MODEL or "gemini-flash-latest")
 *   --include-hidden       also process items with isDisplayed = false
 *   --dry-run              don't write to the database, just print what would be saved
 *   --force                 recompute chunks even if all their items already have links
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import * as schema from '../src/db/schema';

interface CatalogItem {
  slug: string;
  articleId: string;
  categorySlug: string;
  brandSlug: string | null;
  brandName: string | null;
  name: string;
  summary: string;
}

interface CliOptions {
  limit?: number;
  offset: number;
  category?: string;
  chunkSize: number;
  delayMs: number;
  relatedCount: number;
  locale: string;
  model: string;
  includeHidden: boolean;
  dryRun: boolean;
  force: boolean;
}

const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      slug: { type: 'STRING' },
      related: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['slug', 'related'],
  },
};

function buildSystemInstruction(maxRelated: number): string {
  return `Ти — мерчандайзинг-асистент інтернет-магазину промислової автоматизації та електротехніки Power Automation.
Тобі дають список товарів (articleId, slug, name, brand, category, info — короткий опис/характеристики).
Для КОЖНОГО товару зі списку визнач інші товари з ЦЬОГО Ж списку, які з ним пов'язані:
- дуже схожі (та сама лінійка/серія, прямі альтернативи, близькі технічні характеристики), АБО
- логічно пов'язані/сумісні (аксесуари, комплектуючі, часто купують разом, частини однієї системи чи лінії).
Правила:
- Посилайся ТІЛЬКИ на "slug" зі списку, який тобі надано. Ніколи не вигадуй значення і не бери slug з інших джерел.
- Не додавай товар сам на себе.
- Максимум ${maxRelated} пов'язаних товарів на один товар, відсортованих від найбільш до найменш релевантного.
- Якщо релевантних товарів дійсно немає — поверни порожній масив "related", не притягуй випадкові товари "про всяк випадок".
- Відповідай ЛИШЕ валідним JSON-масивом об'єктів {"slug": string, "related": string[]} без жодного тексту поза ним.`;
}

function parseArgs(argv: string[]): CliOptions {
  const raw: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;
    raw[match[1]] = match[2] ?? 'true';
  }

  if (raw.help) {
    console.log(`Generates related-products links via Gemini. See the file header in scripts/generate-linked-items.ts for full flag docs.`);
    process.exit(0);
  }

  return {
    limit: raw.limit ? parseInt(raw.limit, 10) : undefined,
    offset: raw.offset ? parseInt(raw.offset, 10) : 0,
    category: raw.category,
    chunkSize: raw['chunk-size'] ? parseInt(raw['chunk-size'], 10) : 40,
    delayMs: raw['delay-ms'] ? parseInt(raw['delay-ms'], 10) : 4000,
    relatedCount: raw['related-count'] ? parseInt(raw['related-count'], 10) : 8,
    locale: raw.locale || 'ua',
    model: raw.model || process.env.GEMINI_MODEL || 'gemini-flash-latest',
    includeHidden: raw['include-hidden'] === 'true',
    dryRun: raw['dry-run'] === 'true',
    force: raw.force === 'true',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildSummary(description: string, specifications: string | null): string {
  const desc = stripHtml(description);
  const specs = stripHtml(specifications);
  const parts = [desc];
  if (specs && specs !== desc) parts.push(specs);
  const combined = parts.filter(Boolean).join(' | ');
  return combined.length > 260 ? `${combined.slice(0, 260)}…` : combined;
}

async function loadCatalog(opts: CliOptions): Promise<{ catalog: CatalogItem[]; skipped: number }> {
  const items = opts.includeHidden
    ? await db.select().from(schema.item)
    : await db.select().from(schema.item).where(eq(schema.item.isDisplayed, true));

  const filteredItems = opts.category
    ? items.filter((item) => item.categorySlug === opts.category)
    : items;

  const details = await db.select().from(schema.itemDetails);
  const detailsBySlug = new Map<string, typeof details>();
  for (const detail of details) {
    const arr = detailsBySlug.get(detail.itemSlug) ?? [];
    arr.push(detail);
    detailsBySlug.set(detail.itemSlug, arr);
  }

  const brands = await db.select().from(schema.brand);
  const brandNameByAlias = new Map(brands.map((b) => [b.alias, b.name]));

  const catalog: CatalogItem[] = [];
  let skipped = 0;

  for (const item of filteredItems) {
    const itemDetailsList = detailsBySlug.get(item.slug) ?? [];
    const detail =
      itemDetailsList.find((d) => d.locale === opts.locale) ??
      itemDetailsList.find((d) => d.locale === 'ua') ??
      itemDetailsList.find((d) => d.locale === 'en') ??
      itemDetailsList[0];

    if (!detail) {
      skipped++;
      continue;
    }

    catalog.push({
      slug: item.slug,
      articleId: item.articleId,
      categorySlug: item.categorySlug,
      brandSlug: item.brandSlug,
      brandName: item.brandSlug ? (brandNameByAlias.get(item.brandSlug) ?? item.brandSlug) : null,
      name: detail.itemName,
      summary: buildSummary(detail.description, detail.specifications),
    });
  }

  return { catalog, skipped };
}

function sortForCoherence(catalog: CatalogItem[]): CatalogItem[] {
  return [...catalog].sort((a, b) => {
    const categoryCmp = a.categorySlug.localeCompare(b.categorySlug);
    if (categoryCmp !== 0) return categoryCmp;
    const brandCmp = (a.brandSlug ?? '').localeCompare(b.brandSlug ?? '');
    if (brandCmp !== 0) return brandCmp;
    return a.name.localeCompare(b.name);
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function requestWithRetry(model: string, apiKey: string, body: unknown, maxRetries = 5): Promise<unknown[]> {
  let attempt = 0;
  let backoffMs = 5000;

  while (true) {
    attempt++;
    const response = await fetch(GEMINI_ENDPOINT(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Empty response from Gemini (no candidates/text returned)');
      }
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        throw new Error(`Failed to parse Gemini JSON response: ${(err as Error).message}`);
      }
    }

    const isRateLimited = response.status === 429;
    const isServerError = response.status >= 500;
    const errorBody = await response.text().catch(() => '');

    if ((isRateLimited || isServerError) && attempt <= maxRetries) {
      const retryAfterHeader = response.headers.get('retry-after');
      const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : backoffMs;
      console.warn(`    Gemini request failed (${response.status}), retry ${attempt}/${maxRetries} in ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
      backoffMs = Math.min(backoffMs * 2, 60000);
      continue;
    }

    throw new Error(`Gemini request failed: ${response.status} ${response.statusText} — ${errorBody.slice(0, 500)}`);
  }
}

async function callGemini(chunk: CatalogItem[], apiKey: string, opts: CliOptions): Promise<Map<string, string[]>> {
  const validSlugs = new Set(chunk.map((item) => item.slug));

  const payload = chunk.map((item) => ({
    slug: item.slug,
    articleId: item.articleId,
    name: item.name,
    brand: item.brandName,
    category: item.categorySlug,
    info: item.summary,
  }));

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(opts.relatedCount) }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: JSON.stringify(payload) }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const raw = await requestWithRetry(opts.model, apiKey, body);

  const result = new Map<string, string[]>();
  for (const entry of raw as Array<{ slug?: unknown; related?: unknown }>) {
    if (!entry || typeof entry.slug !== 'string' || !validSlugs.has(entry.slug)) continue;
    const related = Array.isArray(entry.related)
      ? entry.related.filter(
          (s: unknown): s is string => typeof s === 'string' && s !== entry.slug && validSlugs.has(s),
        )
      : [];
    result.set(entry.slug, related.slice(0, opts.relatedCount));
  }
  return result;
}

async function saveRelations(chunk: CatalogItem[], relations: Map<string, string[]>, opts: CliOptions): Promise<void> {
  const bySlug = new Map(chunk.map((item) => [item.slug, item]));

  for (const item of chunk) {
    const related = relations.get(item.slug) ?? [];
    const linkedCategorySlugs = related.map((slug) => bySlug.get(slug)?.categorySlug ?? '');

    if (opts.dryRun) {
      console.log(`    [dry-run] ${item.articleId} (${item.slug}) -> ${related.length ? related.join(', ') : '(none)'}`);
      continue;
    }

    const [existing] = await db
      .select()
      .from(schema.linkedItems)
      .where(eq(schema.linkedItems.itemSlug, item.slug))
      .limit(1);

    if (existing) {
      await db
        .update(schema.linkedItems)
        .set({ linkedItemSlug: related, linkedCaregorySlug: linkedCategorySlugs })
        .where(eq(schema.linkedItems.id, existing.id));
    } else {
      await db.insert(schema.linkedItems).values({
        itemSlug: item.slug,
        linkedItemSlug: related,
        linkedCaregorySlug: linkedCategorySlugs,
      });
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in .env — aborting.');
    process.exit(1);
  }

  console.log('Loading catalog from the database...');
  const { catalog, skipped } = await loadCatalog(opts);
  console.log(
    `Loaded ${catalog.length} item(s)${opts.category ? ` in category "${opts.category}"` : ''}` +
      `${opts.includeHidden ? '' : ' (isDisplayed=true only)'}.` +
      (skipped ? ` Skipped ${skipped} item(s) with no item_details row.` : ''),
  );

  if (catalog.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  const sorted = sortForCoherence(catalog);
  const sliceEnd = opts.limit != null ? opts.offset + opts.limit : undefined;
  const selected = sorted.slice(opts.offset, sliceEnd);
  console.log(
    `Processing ${selected.length} item(s) (offset=${opts.offset}${opts.limit != null ? `, limit=${opts.limit}` : ''}).`,
  );

  if (selected.length === 0) {
    console.log('Nothing to process for the given offset/limit.');
    return;
  }

  const chunks = chunkArray(selected, opts.chunkSize);
  console.log(
    `Split into ${chunks.length} chunk(s) of up to ${opts.chunkSize} items each. ` +
      `model=${opts.model}, delay=${opts.delayMs}ms, relatedCount=${opts.relatedCount}${opts.dryRun ? ', DRY RUN' : ''}\n`,
  );

  let existingSlugs = new Set<string>();
  if (!opts.force) {
    const existingRows = await db.select({ itemSlug: schema.linkedItems.itemSlug }).from(schema.linkedItems);
    existingSlugs = new Set(existingRows.map((r) => r.itemSlug));
  }

  const failedChunks: number[] = [];
  let processedItems = 0;
  let skippedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const label = `[chunk ${i + 1}/${chunks.length}]`;

    if (!opts.force && chunk.every((item) => existingSlugs.has(item.slug))) {
      console.log(`${label} skipped — all ${chunk.length} item(s) already have linked_items (use --force to recompute).`);
      skippedChunks++;
      continue;
    }

    if (chunk.length < 2) {
      await saveRelations(chunk, new Map(), opts);
      console.log(`${label} only 1 item — no candidates to relate to, saved empty relations.`);
      continue;
    }

    console.log(`${label} category≈"${chunk[0]?.categorySlug}" items=${chunk.length} — requesting Gemini...`);

    try {
      const relations = await callGemini(chunk, apiKey, opts);
      await saveRelations(chunk, relations, opts);
      processedItems += chunk.length;
      const avgRelated =
        chunk.reduce((sum, item) => sum + (relations.get(item.slug)?.length ?? 0), 0) / chunk.length;
      console.log(`${label} done — avg ${avgRelated.toFixed(1)} related item(s) per product.`);
    } catch (error) {
      console.error(`${label} FAILED: ${(error as Error).message}`);
      failedChunks.push(i + 1);
    }

    if (i < chunks.length - 1) {
      await sleep(opts.delayMs);
    }
  }

  console.log('\n=== Summary ===');
  console.log(
    `Chunks: ${chunks.length} total, ${chunks.length - skippedChunks - failedChunks.length} processed, ` +
      `${skippedChunks} skipped (already done), ${failedChunks.length} failed.`,
  );
  console.log(`Items processed: ${processedItems}`);
  if (failedChunks.length > 0) {
    console.log(
      `Failed chunk(s): ${failedChunks.join(', ')}. Re-run the same command to retry — ` +
        `already-saved chunks are skipped automatically.`,
    );
  }

  process.exit(failedChunks.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
