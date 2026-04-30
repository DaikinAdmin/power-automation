import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getExchangeRate } from "@/lib/server-currency";
import { getDomainConfigByHost, type DomainConfig, DOMAIN_CONFIGS } from "@/lib/domain-config";
import { toAbsoluteImageUrl } from "@/lib/image-utils";
import { getVatByCountryCode } from "@/helpers/db/vat-queries";

/** Domain-specific feed configuration */
interface FeedConfig {
  baseUrl: string;
  locale: string;
  currency: string;
  exchangeTarget: string;
  title: string;
  description: string;
}

function getFeedConfig(domainConfig: DomainConfig): FeedConfig {
  if (domainConfig.key === 'ua') {
    return {
      baseUrl: domainConfig.baseUrl,
      locale: 'ua',
      currency: 'UAH',
      exchangeTarget: 'UAH',
      title: 'Power Automation — промислова автоматизація',
      description: 'Інтернет-магазин промислового обладнання. Siemens, Pilz, Atlas Copco та інші бренди.',
    };
  }
  // PL (default)
  return {
    baseUrl: domainConfig.baseUrl,
    locale: 'pl',
    currency: 'PLN',
    exchangeTarget: 'PLN',
    title: 'Power Automation — automatyzacja przemysłowa',
    description: 'Sklep internetowy z urządzeniami przemysłowymi. Siemens, Pilz, Atlas Copco i inne marki.',
  };
}

/**
 * Google Merchant Center product feed (RSS 2.0 / Google Shopping)
 * URL: /feed/products.xml
 * Public, no auth, auto-updated on every request.
 *
 * The feed is domain-aware: PL domain → PLN prices, PL locale;
 *                           UA domain → UAH prices, UA locale.
 */
export async function GET(request: NextRequest) {
  // --- Detect domain ---
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const domainConfig = getDomainConfigByHost(host);
  const feedCfg = getFeedConfig(domainConfig);

  try {
    // 0. Fetch EUR → target currency exchange rate and VAT once
    const eurToTarget = await getExchangeRate("EUR", feedCfg.exchangeTarget);
    const domainCountryCodeMap: Record<string, string> = { pl: 'PL', ua: 'UA' };
    const domainCountryCode = domainCountryCodeMap[domainConfig.key] ?? 'PL';
    const vatPercentage = await getVatByCountryCode(domainCountryCode);
    const vatInclusive = domainConfig.key === 'ua';
    const vatMultiplier = vatInclusive && vatPercentage > 0 ? 1 + vatPercentage / 100 : 1;

    // Exchange-rate cache: converts a price stored in `sourceCurrency` → feed target currency.
    // Formula mirrors useCurrency.convertFromCurrency: price / eurToSource * eurToTarget
    const rateBySource = new Map<string, number>();
    rateBySource.set('EUR', eurToTarget);
    rateBySource.set(feedCfg.exchangeTarget, 1);
    const getItemRate = async (src: string): Promise<number> => {
      if (rateBySource.has(src)) return rateBySource.get(src)!;
      const eurToSrc = await getExchangeRate('EUR', src);
      const rate = eurToTarget / eurToSrc;
      rateBySource.set(src, rate);
      return rate;
    };

    // 1. Fetch all displayed items
    const items = await db
      .select({
        articleId: schema.item.articleId,
        slug: schema.item.slug,
        itemImageLink: schema.item.itemImageLink,
        brandSlug: schema.item.brandSlug,
        isDisplayed: schema.item.isDisplayed,
      })
      .from(schema.item)
      .where(eq(schema.item.isDisplayed, true));

    // 2. For each item, fetch localised details, brand, and best price
    const feedItems: string[] = [];

    for (const item of items) {
      // Get locale-specific details
      const [details] = await db
        .select({
          itemName: schema.itemDetails.itemName,
          description: schema.itemDetails.description,
        })
        .from(schema.itemDetails)
        .where(
          and(
            eq(schema.itemDetails.itemSlug, item.slug),
            eq(schema.itemDetails.locale, feedCfg.locale)
          )
        )
        .limit(1);

      if (!details) continue;

      // Get brand
      let brandName = "";
      if (item.brandSlug) {
        const [brand] = await db
          .select({ name: schema.brand.name })
          .from(schema.brand)
          .where(eq(schema.brand.alias, item.brandSlug))
          .limit(1);
        brandName = brand?.name ?? "";
      }

      // Get prices (all warehouses) — pick the one with stock, lowest price
      const prices = await db
        .select({
          price: schema.itemPrice.price,
          quantity: schema.itemPrice.quantity,
          promotionPrice: schema.itemPrice.promotionPrice,
          promoEndDate: schema.itemPrice.promoEndDate,
          margin: schema.itemPrice.margin,
          initialCurrency: schema.itemPrice.initialCurrency,
        })
        .from(schema.itemPrice)
        .where(eq(schema.itemPrice.itemSlug, item.slug));

      if (prices.length === 0) continue;

      // Prefer in-stock warehouse with lowest price
      const inStockPrices = prices.filter((p) => p.quantity > 0);
      const bestPrice =
        inStockPrices.length > 0
          ? inStockPrices.reduce((a, b) => (a.price < b.price ? a : b))
          : prices.reduce((a, b) => (a.price < b.price ? a : b));

      const inStock = inStockPrices.length > 0;
      const availability = inStock ? "in stock" : "out of stock";

      // price in DB already includes margin (= initialPrice × (1 + margin/100)).
      // promotionPrice in DB does NOT include margin — margin is applied when needed.
      // This mirrors the pattern used in /api/public/items/[locale] and useCatalogPricing.
      const marginRate = 1 + (bestPrice.margin ?? 20) / 100;
      const srcCurrency = (bestPrice.initialCurrency as string | null) ?? 'EUR';
      const itemRate = await getItemRate(srcCurrency);
      const targetPrice = (bestPrice.price * itemRate * vatMultiplier).toFixed(2);

      // Images — always absolute, pointing to powerautomation.pl
      const images = item.itemImageLink ?? [];
      const mainImage = images[0] ?? "";
      if (!mainImage) continue; // Skip items without images per spec

      // Build title: Brand + ArticleId + ItemName
      const titleParts = [brandName, details.itemName].filter(
        Boolean
      );
      const title = titleParts.join(" ");

      // Description — strip HTML, limit length
      const description = stripHtml(details.description).slice(0, 5000);

      // Price formatting
      const priceFormatted = `${targetPrice} ${feedCfg.currency}`;

      // Sale price — only if active promo.
      // promotionPrice is stored without margin; apply marginRate before comparing with price.
      let salePriceXml = "";
      if (bestPrice.promotionPrice && bestPrice.promotionPrice > 0) {
        const promoEnd = bestPrice.promoEndDate
          ? new Date(bestPrice.promoEndDate)
          : null;
        const isPromoActive = !promoEnd || promoEnd > new Date();
        const promoWithMargin = bestPrice.promotionPrice * marginRate;
        if (isPromoActive && promoWithMargin < bestPrice.price) {
          const targetPromoPrice = (promoWithMargin * itemRate * vatMultiplier).toFixed(2);
          salePriceXml = `      <g:sale_price>${targetPromoPrice} ${feedCfg.currency}</g:sale_price>`;
        }
      }

      // Additional images — absolute URLs via powerautomation.pl
      const additionalImages = images
        .slice(1)
        .map((img) => {
          const imgUrl = toAbsoluteImageUrl(img);
          return `      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`;
        })
        .join("\n");

      const mainImageUrl = toAbsoluteImageUrl(mainImage);

      const productLink = `${feedCfg.baseUrl}/${feedCfg.locale}/product/${encodeURIComponent(item.slug)}`;

      feedItems.push(`    <item>
      <g:id>${escapeXml(item.articleId)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productLink)}</g:link>
      <g:image_link>${escapeXml(mainImageUrl)}</g:image_link>
${additionalImages ? additionalImages + "\n" : ""}      <g:price>${priceFormatted}</g:price>
${salePriceXml ? salePriceXml + "\n" : ""}      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brandName)}</g:brand>
      <g:mpn>${escapeXml(item.articleId)}</g:mpn>
      <g:google_product_category>222</g:google_product_category>
    </item>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${feedCfg.title}</title>
    <link>${feedCfg.baseUrl}</link>
    <description>${feedCfg.description}</description>
${feedItems.join("\n")}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error generating product feed:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${feedCfg.title}</title>
    <link>${feedCfg.baseUrl}</link>
    <description>Feed temporarily unavailable</description>
  </channel>
</rss>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
