import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import logger from '@/lib/logger';

const LOCALE_LABELS: Record<string, string> = {
  pl: 'Polish',
  ua: 'Ukrainian',
  en: 'English',
  es: 'Spanish',
};

const SYSTEM_PROMPT = `You are an expert translator for industrial automation products (Schneider Electric, Siemens, Pilz, Omron, ABB, etc.). Translate product content accurately using correct technical terminology for each target market. Keep brand names, model numbers, and part codes unchanged. Respond ONLY with valid JSON — no markdown, no explanation.`;

async function translateFields(
  apiKey: string,
  fields: Record<string, string | null>,
  sourceLang: string,
  targetLang: string,
): Promise<Record<string, string | null>> {
  const toTranslate: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v && v.trim()) toTranslate[k] = v;
  }

  if (Object.keys(toTranslate).length === 0) {
    return fields;
  }

  const src = LOCALE_LABELS[sourceLang] || sourceLang;
  const tgt = LOCALE_LABELS[targetLang] || targetLang;
  const userMessage = `Translate from ${src} to ${tgt}. Return JSON with same keys.\n${JSON.stringify(toTranslate)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${res.status} ${errText}`);
  }

  const data = await res.json() as { content: { type: string; text: string }[] };
  const text = data.content[0]?.type === 'text' ? data.content[0].text : '';

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const translated = JSON.parse(cleaned) as Record<string, string>;

  const result: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = (v && v.trim() && translated[k]) ? translated[k] : v;
  }
  return result;
}

// GET: fetch existing translations for given item slugs
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const slugsParam = searchParams.get('slugs');
    if (!slugsParam) {
      return NextResponse.json({ error: 'slugs parameter required' }, { status: 400 });
    }

    const slugs = slugsParam.split(',').filter(Boolean);
    if (slugs.length === 0) {
      return NextResponse.json({ error: 'No slugs provided' }, { status: 400 });
    }

    // Fetch item details for all requested slugs (all locales)
    const details = await db
      .select()
      .from(schema.itemDetails)
      .where(inArray(schema.itemDetails.itemSlug, slugs));

    // Also fetch item basic info for display
    const items = await db
      .select({
        slug: schema.item.slug,
        articleId: schema.item.articleId,
        brandSlug: schema.item.brandSlug,
      })
      .from(schema.item)
      .where(inArray(schema.item.slug, slugs));

    // Group details by slug
    const grouped: Record<string, {
      item: { slug: string; articleId: string | null; brandSlug: string | null };
      locales: Record<string, {
        id: string;
        itemName: string;
        description: string;
        specifications: string | null;
        metaDescription: string | null;
        metaKeyWords: string | null;
      }>;
    }> = {};

    for (const item of items) {
      grouped[item.slug] = { item, locales: {} };
    }

    for (const d of details) {
      if (!grouped[d.itemSlug]) continue;
      grouped[d.itemSlug].locales[d.locale] = {
        id: d.id,
        itemName: d.itemName,
        description: d.description,
        specifications: d.specifications,
        metaDescription: d.metaDescription,
        metaKeyWords: d.metaKeyWords,
      };
    }

    return NextResponse.json({ items: grouped });
  } catch (error) {
    logger.error('Translation GET error', { error });
    return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
  }
}

// POST: translate items
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { slugs, sourceLang, targetLangs } = body as {
      slugs: string[];
      sourceLang: string;
      targetLangs: string[];
    };

    if (!slugs?.length || !sourceLang || !targetLangs?.length) {
      return NextResponse.json({ error: 'Missing required fields: slugs, sourceLang, targetLangs' }, { status: 400 });
    }

    // Validate locales
    const validLocales = Object.keys(LOCALE_LABELS);
    if (!validLocales.includes(sourceLang)) {
      return NextResponse.json({ error: `Invalid source language: ${sourceLang}` }, { status: 400 });
    }
    for (const lang of targetLangs) {
      if (!validLocales.includes(lang)) {
        return NextResponse.json({ error: `Invalid target language: ${lang}` }, { status: 400 });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Fetch source locale details for all slugs
    const sourceDetails = await db
      .select()
      .from(schema.itemDetails)
      .where(
        and(
          inArray(schema.itemDetails.itemSlug, slugs),
          eq(schema.itemDetails.locale, sourceLang),
        ),
      );

    if (sourceDetails.length === 0) {
      return NextResponse.json({
        error: `No items found with locale "${sourceLang}"`,
      }, { status: 404 });
    }

    logger.info('Starting batch translation', {
      userId: session.user.id,
      itemCount: sourceDetails.length,
      sourceLang,
      targetLangs,
    });

    const results: { slug: string; locale: string; status: 'created' | 'updated' | 'error'; error?: string }[] = [];

    for (const source of sourceDetails) {
      const fields: Record<string, string | null> = {
        itemName: source.itemName,
        description: source.description,
        specifications: source.specifications,
        metaDescription: source.metaDescription,
        metaKeyWords: source.metaKeyWords,
      };

      for (const targetLang of targetLangs) {
        if (targetLang === sourceLang) continue;

        try {
          const translated = await translateFields(apiKey, fields, sourceLang, targetLang);

          // Check if translation already exists
          const existing = await db
            .select({ id: schema.itemDetails.id })
            .from(schema.itemDetails)
            .where(
              and(
                eq(schema.itemDetails.itemSlug, source.itemSlug),
                eq(schema.itemDetails.locale, targetLang),
              ),
            )
            .limit(1);

          if (existing.length > 0) {
            // Update existing
            await db
              .update(schema.itemDetails)
              .set({
                itemName: translated.itemName ?? source.itemName,
                description: translated.description ?? source.description,
                specifications: translated.specifications,
                metaDescription: translated.metaDescription,
                metaKeyWords: translated.metaKeyWords,
              })
              .where(eq(schema.itemDetails.id, existing[0].id));

            results.push({ slug: source.itemSlug, locale: targetLang, status: 'updated' });
          } else {
            // Create new translation
            await db.insert(schema.itemDetails).values({
              locale: targetLang,
              itemName: translated.itemName ?? source.itemName,
              description: translated.description ?? source.description,
              specifications: translated.specifications,
              metaDescription: translated.metaDescription,
              metaKeyWords: translated.metaKeyWords,
              itemSlug: source.itemSlug,
              seller: source.seller,
              discount: source.discount,
              popularity: source.popularity,
            });

            results.push({ slug: source.itemSlug, locale: targetLang, status: 'created' });
          }
        } catch (err: any) {
          logger.error('Translation failed for item', {
            slug: source.itemSlug,
            targetLang,
            error: err.message,
          });
          results.push({
            slug: source.itemSlug,
            locale: targetLang,
            status: 'error',
            error: err.message,
          });
        }
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status === 'error').length;

    logger.info('Batch translation completed', { created, updated, errors });

    return NextResponse.json({
      success: true,
      results,
      summary: { created, updated, errors, total: results.length },
    });
  } catch (error: any) {
    logger.error('Translation POST error', { error: error.message });
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
