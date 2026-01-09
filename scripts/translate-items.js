const fs = require('fs/promises');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(PROJECT_ROOT, 'parsed-data.json');
const TARGET_FILE = path.join(PROJECT_ROOT, 'parsed-data-pl.json');
const SOURCE_LOCALE = 'ua';
const TARGET_LOCALE = 'pl';
const GOOGLE_SOURCE_LOCALE = 'uk';
const TRANSLATION_FIELDS = [
  'itemName',
  'categoryName',
  'seller',
  'description',
  'specifications',
  'metaKeywords',
  'metaDescription',
  'categories',
  'subcategory',
  'parentCategory'
];
const MAX_SEGMENT_LENGTH = 4000;
const THROTTLE_MS = 500;
const translationCache = new Map();

function chunkText(text) {
  const segments = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + MAX_SEGMENT_LENGTH, text.length);
    if (end < text.length) {
      const newlineIndex = text.lastIndexOf('\n', end);
      const spaceIndex = text.lastIndexOf(' ', end);
      const boundary = Math.max(newlineIndex, spaceIndex);
      if (boundary > cursor) {
        end = boundary;
      }
    }
    if (end === cursor) {
      end = Math.min(text.length, cursor + MAX_SEGMENT_LENGTH);
    }
    const segment = text.slice(cursor, end);
    if (segment) {
      segments.push(segment);
    }
    cursor = end;
  }
  return segments;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateText(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  if (translationCache.has(value)) {
    return translationCache.get(value);
  }

  const segments = chunkText(value);
  const translations = [];

  for (const segment of segments) {
    const encoded = encodeURIComponent(segment);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${GOOGLE_SOURCE_LOCALE}&tl=${TARGET_LOCALE}&dt=t&q=${encoded}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'node-translate-script/1.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation request failed (${response.status} ${response.statusText})`);
    }

    const payload = await response.json();
    const translatedSegment = payload[0].map((chunk) => chunk[0]).join('');
    translations.push(translatedSegment);
    await sleep(THROTTLE_MS);
  }

  const translatedValue = translations.join('');
  translationCache.set(value, translatedValue);
  return translatedValue;
}

async function translateItemFields(item) {
  const translatedItem = { ...item };
  for (const field of TRANSLATION_FIELDS) {
    const originalValue = translatedItem[field];
    if (typeof originalValue === 'string' && originalValue.trim() !== '') {
      try {
        translatedItem[field] = await translateText(originalValue);
      } catch (error) {
        console.error(`Translation failed for ${field} on articleId=${item.articleId}:`, error.message);
        translatedItem[field] = originalValue;
      }
    }
  }
  translatedItem.locale = TARGET_LOCALE;
  return translatedItem;
}

async function main() {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is required (run on Node 18+).');
  }

  const rawData = await fs.readFile(SOURCE_FILE, 'utf-8');
  const sourceData = JSON.parse(rawData);
  if (!Array.isArray(sourceData.items)) {
    throw new Error('Source file does not expose an items array.');
  }

  const translatedItems = [];
  for (let index = 0; index < sourceData.items.length; index++) {
    const item = sourceData.items[index];
    let normalizedItem = item;

    if (item && item.locale === SOURCE_LOCALE && item.itemName) {
      normalizedItem = await translateItemFields(item);
      console.log(`Translated [${index + 1}/${sourceData.items.length}] articleId=${item.articleId || 'unknown'}`);
    } else if (item && item.locale === SOURCE_LOCALE) {
      normalizedItem = { ...item, locale: TARGET_LOCALE };
    }

    translatedItems.push(normalizedItem);
  }

  const outputData = {
    ...sourceData,
    items: translatedItems,
  };

  await fs.writeFile(TARGET_FILE, JSON.stringify(outputData, null, 2));
  console.log(`Polish dataset written to ${TARGET_FILE}`);
}

main().catch((error) => {
  console.error('Translation script failed:', error);
  process.exit(1);
});
