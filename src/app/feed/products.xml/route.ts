import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getExchangeRate } from "@/lib/server-currency";
import { getBaseUrl, getDefaultLocale } from "@/lib/domain-config";

/**
 * Google Merchant Center product feed (RSS 2.0 / Google Shopping)
 * URL: /feed/products.xml
 * Public, no auth, auto-updated on every request.
 */
export async function GET() {
  try {
    const BASE_URL = getBaseUrl();
    const LOCALE = getDefaultLocale();

    // 0. Fetch EUR → UAH exchange rate once
    const eurToUah = await getExchangeRate("EUR", "UAH");

    // 1. Fetch all displayed items with UA details, brand, and prices
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

    // 2. For each item, fetch details (UA), brand, and best price
    const feedItems: string[] = [];

    for (const item of items) {
      // Get UA locale details
      const [details] = await db
        .select({
          itemName: schema.itemDetails.itemName,
          description: schema.itemDetails.description,
        })
        .from(schema.itemDetails)
        .where(
          and(
            eq(schema.itemDetails.itemSlug, item.slug),
            eq(schema.itemDetails.locale, LOCALE)
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

      // Apply margin and convert EUR → UAH
      const marginRate = 1 + (bestPrice.margin ?? 20) / 100;
      const eurPrice = bestPrice.price * marginRate;
      const uahPrice = Math.round(eurPrice * eurToUah);

      // Images
      const images = item.itemImageLink ?? [];
      const mainImage = images[0] ?? "";
      if (!mainImage) continue; // Skip items without images per spec

      // Build title: Brand + ArticleId + ItemName
      const titleParts = [brandName, item.articleId, details.itemName].filter(
        Boolean
      );
      const title = titleParts.join(" ");

      // Description — strip HTML, limit length
      const description = stripHtml(details.description).slice(0, 5000);

      // Price formatting: "1234 UAH"
      const priceFormatted = `${uahPrice} UAH`;

      // Sale price — only if active promo
      let salePriceXml = "";
      if (bestPrice.promotionPrice && bestPrice.promotionPrice > 0) {
        const promoEnd = bestPrice.promoEndDate
          ? new Date(bestPrice.promoEndDate)
          : null;
        const isPromoActive = !promoEnd || promoEnd > new Date();
        if (isPromoActive && bestPrice.promotionPrice < bestPrice.price) {
          const uahPromoPrice = Math.round(bestPrice.promotionPrice * marginRate * eurToUah);
          salePriceXml = `      <g:sale_price>${uahPromoPrice} UAH</g:sale_price>`;
        }
      }

      // Additional images
      const additionalImages = images
        .slice(1)
        .map((img) => {
          const imgUrl = img.startsWith("http") ? img : `${BASE_URL}${img}`;
          return `      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`;
        })
        .join("\n");

      const mainImageUrl = mainImage.startsWith("http")
        ? mainImage
        : `${BASE_URL}${mainImage}`;

      const productLink = `${BASE_URL}/ua/product/${encodeURIComponent(item.articleId)}`;

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
    <title>Power Automation — промислова автоматизація</title>
    <link>${BASE_URL}</link>
    <description>Інтернет-магазин промислового обладнання. Siemens, Pilz, Atlas Copco та інші бренди.</description>
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
    <title>Power Automation</title>
    <link>${BASE_URL}</link>
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
