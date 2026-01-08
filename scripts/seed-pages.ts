import "dotenv/config";
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const pageContentData = [
  {
    slug: "about",
    locale: "ua",
    title: "Про нас",
    content: {
      time: Date.now(),
      blocks: [
        { type: "header", data: { text: "Про компанію", level: 2 } },
        { type: "paragraph", data: { text: "Ми — сучасний інтернет-магазин." } },
        {
          type: "list",
          data: {
            style: "unordered",
            items: ["Швидка доставка", "Гарантія", "Підтримка"],
          },
        },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "purchase-delivery",
    locale: "ua",
    title: "Доставка та оплата",
    content: {
      blocks: [
        { type: "paragraph", data: { text: "Доставка здійснюється по всій Україні." } },
        { type: "paragraph", data: { text: "Оплата: карткою або готівкою при отриманні." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "refunding",
    locale: "ua",
    title: "Повернення товару",
    content: {
      blocks: [
        { type: "paragraph", data: { text: "Можна повернути товар протягом 14 днів." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "contacts",
    locale: "ua",
    title: "Контакти",
    content: {
      blocks: [
        { type: "paragraph", data: { text: "Телефон: +380 123 456 789" } },
        { type: "paragraph", data: { text: "Email: info@shop.com" } },
      ],
      version: "2.30.0",
    },
  },
  // Англійська версія
  {
    slug: "about",
    locale: "en",
    title: "About Us",
    content: {
      time: Date.now(),
      blocks: [
        { type: "header", data: { text: "About the Company", level: 2 } },
        { type: "paragraph", data: { text: "We are a modern online store specializing in industrial automation and electrical equipment." } },
        {
          type: "list",
          data: {
            style: "unordered",
            items: ["Fast delivery across Europe", "Warranty on all products", "24/7 Customer support"],
          },
        },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "purchase-delivery",
    locale: "en",
    title: "Delivery and Payment",
    content: {
      blocks: [
        { type: "header", data: { text: "Delivery", level: 2 } },
        { type: "paragraph", data: { text: "We deliver across Europe using reliable shipping partners." } },
        { type: "paragraph", data: { text: "Payment options: credit card, bank transfer, or cash on delivery." } },
        {
          type: "list",
          data: {
            style: "ordered",
            items: ["Standard delivery: 3-5 business days", "Express delivery: 1-2 business days", "Free shipping on orders over €500"],
          },
        },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "refunding",
    locale: "en",
    title: "refunding Policy",
    content: {
      blocks: [
        { type: "header", data: { text: "Product refunding", level: 2 } },
        { type: "paragraph", data: { text: "You can return the product within 14 days of receipt." } },
        { type: "paragraph", data: { text: "The product must be in its original packaging and unused." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "contacts",
    locale: "en",
    title: "Contact Us",
    content: {
      blocks: [
        { type: "header", data: { text: "Get in Touch", level: 2 } },
        { type: "paragraph", data: { text: "Phone: +380 123 456 789" } },
        { type: "paragraph", data: { text: "Email: info@shop.com" } },
        { type: "paragraph", data: { text: "Address: Kyiv, Ukraine" } },
      ],
      version: "2.30.0",
    },
  },
  // Польська версія
  {
    slug: "about",
    locale: "pl",
    title: "O nas",
    content: {
      time: Date.now(),
      blocks: [
        { type: "header", data: { text: "O firmie", level: 2 } },
        { type: "paragraph", data: { text: "Jesteśmy nowoczesnym sklepem internetowym specjalizującym się w automatyce przemysłowej." } },
        {
          type: "list",
          data: {
            style: "unordered",
            items: ["Szybka dostawa", "Gwarancja na wszystkie produkty", "Wsparcie 24/7"],
          },
        },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "purchase-delivery",
    locale: "pl",
    title: "Dostawa i płatność",
    content: {
      blocks: [
        { type: "header", data: { text: "Dostawa", level: 2 } },
        { type: "paragraph", data: { text: "Dostarczamy na terenie całej Europy." } },
        { type: "paragraph", data: { text: "Opcje płatności: karta kredytowa, przelew bankowy lub gotówka przy odbiorze." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "refunding",
    locale: "pl",
    title: "Zwroty",
    content: {
      blocks: [
        { type: "header", data: { text: "Polityka zwrotów", level: 2 } },
        { type: "paragraph", data: { text: "Możesz zwrócić produkt w ciągu 14 dni od otrzymania." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "contacts",
    locale: "pl",
    title: "Kontakt",
    content: {
      blocks: [
        { type: "header", data: { text: "Skontaktuj się z nami", level: 2 } },
        { type: "paragraph", data: { text: "Telefon: +380 123 456 789" } },
        { type: "paragraph", data: { text: "Email: info@shop.com" } },
      ],
      version: "2.30.0",
    },
  },
  // Іспанська версія
  {
    slug: "about",
    locale: "es",
    title: "Sobre nosotros",
    content: {
      time: Date.now(),
      blocks: [
        { type: "header", data: { text: "Sobre la empresa", level: 2 } },
        { type: "paragraph", data: { text: "Somos una tienda en línea moderna especializada en automatización industrial." } },
        {
          type: "list",
          data: {
            style: "unordered",
            items: ["Entrega rápida", "Garantía en todos los productos", "Soporte 24/7"],
          },
        },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "purchase-delivery",
    locale: "es",
    title: "Entrega y pago",
    content: {
      blocks: [
        { type: "header", data: { text: "Entrega", level: 2 } },
        { type: "paragraph", data: { text: "Entregamos en toda Europa." } },
        { type: "paragraph", data: { text: "Opciones de pago: tarjeta de crédito, transferencia bancaria o efectivo contra entrega." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "refunding",
    locale: "es",
    title: "Devoluciones",
    content: {
      blocks: [
        { type: "header", data: { text: "Política de devoluciones", level: 2 } },
        { type: "paragraph", data: { text: "Puede devolver el producto dentro de los 14 días posteriores a la recepción." } },
      ],
      version: "2.30.0",
    },
  },
  {
    slug: "contacts",
    locale: "es",
    title: "Contacto",
    content: {
      blocks: [
        { type: "header", data: { text: "Contáctenos", level: 2 } },
        { type: "paragraph", data: { text: "Teléfono: +380 123 456 789" } },
        { type: "paragraph", data: { text: "Email: info@shop.com" } },
      ],
      version: "2.30.0",
    },
  },
];

async function seedPageContent() {
  try {
    console.log("=".repeat(60));
    console.log("DATABASE CONNECTION INFO:");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("=".repeat(60));
    console.log("\nSeeding page_content table...");

    for (const page of pageContentData) {
      const existing = await db
        .select()
        .from(schema.pageContent)
        .where(
          and(
            eq(schema.pageContent.slug, page.slug),
            eq(schema.pageContent.locale, page.locale)
          )
        );

      if (existing.length === 0) {
        await db.insert(schema.pageContent).values({
          ...page,
          content: JSON.stringify(page.content), // <-- серіалізуємо JSON
        });
        console.log(`✅ Created page: ${page.title} (${page.slug} - ${page.locale})`);
      } else {
        console.log(`⏭️  Page already exists: ${page.title} (${page.slug} - ${page.locale})`);
      }
    }

    console.log("\n✅ Page content seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding page content:", error);
  } finally {
    process.exit(0);
  }
}

seedPageContent();
