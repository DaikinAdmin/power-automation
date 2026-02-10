import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
  uniqueIndex,
  doublePrecision,
  foreignKey,
  boolean,
  index,
  jsonb,
  serial,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const badge = pgEnum("Badge", [
  "NEW_ARRIVALS",
  "BESTSELLER",
  "HOT_DEALS",
  "LIMITED_EDITION",
  "ABSENT",
  "USED"
]);
export const cartStatus = pgEnum("CartStatus", [
  "PENDING",
  "CHECKED_OUT",
  "COMPLETED",
]);
export const currency = pgEnum("Currency", ["EUR", "UAH", "PLN"]);
export const orderStatus = pgEnum("OrderStatus", [
  "NEW",
  "WAITING_FOR_PAYMENT",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
  "REFUND",
  "DELIVERY",
  "ASK_FOR_PRICE",
]);
export const outOfStockStatus = pgEnum("OutOfStockStatus", [
  "PENDING",
  "PROCESSING",
  "FULFILLED",
  "CANCELLED",
]);
export const paymentStatus = pgEnum("PaymentStatus", [
  "PENDING",
  "INITIATED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);

// export const prismaMigrations = pgTable("_prisma_migrations", {
// 	id: varchar({ length: 36 }).primaryKey().notNull(),
// 	checksum: varchar({ length: 64 }).notNull(),
// 	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
// 	migrationName: varchar("migration_name", { length: 255 }).notNull(),
// 	logs: text(),
// 	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
// 	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
// 	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
// });

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const currencyExchange = pgTable(
  "currency_exchange",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    from: currency().notNull(),
    to: currency().notNull(),
    rate: doublePrecision().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("currency_exchange_from_to_key").using(
      "btree",
      table.from.asc().nullsLast().op("enum_ops"),
      table.to.asc().nullsLast().op("enum_ops")
    ),
  ]
);

export const itemPrice = pgTable(
  "item_price",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    warehouseId: text().notNull(),
    price: doublePrecision().notNull(),
    quantity: integer().notNull(),
    promotionPrice: doublePrecision(),
    promoCode: text(),
    promoStartDate: timestamp({ precision: 3, mode: "string" }),
    promoEndDate: timestamp({ precision: 3, mode: "string" }),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    badge: badge().default("ABSENT"),
    itemSlug: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.warehouseId],
      foreignColumns: [warehouse.id],
      name: "item_price_warehouseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.itemSlug],
      foreignColumns: [item.slug],
      name: "item_price_itemSlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const warehouse = pgTable(
  "warehouse",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: text(),
    displayedName: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    isVisible: boolean().default(true),
    countrySlug: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.countrySlug],
      foreignColumns: [warehouseCountries.slug],
      name: "warehouse_countrySlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  phoneNumber: text("phone_number").default("555-555-555").notNull(),
  userAgreement: boolean("user_agreement").default(false).notNull(),
  countryCode: text("country_code").default("+48").notNull(),
  companyWebpage: text("company_webpage").default(""),
  companyName: text("company_name").default(""),
  companyRole: text("company_role").default(""),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("twoFactor_secret_idx").on(table.secret),
    index("twoFactor_userId_idx").on(table.userId),
  ]
);

export const item = pgTable(
  "item",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    articleId: text().notNull(),
    slug: text().notNull().unique(),
    alias: text(),
    isDisplayed: boolean().default(false).notNull(),
    sellCounter: integer().default(0),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    warrantyLength: integer().default(12).notNull(),
    warrantyType: text().default("manufacturer").notNull(),
    brandSlug: text(),
    // categorySlug can reference either subcategories.slug (if item has subcategory) or category.slug (if not)
    categorySlug: text().notNull(),
    itemImageLink: text().array(),
    linkedItems: text().array(),
  },
  (table) => [
    foreignKey({
      columns: [table.brandSlug],
      foreignColumns: [brand.alias],
      name: "item_brandSlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const category = pgTable("category", {
  id: text()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: text().notNull(),
  slug: text().notNull().unique(),
  isVisible: boolean().default(true),
  imageLink: text(),
  createdAt: timestamp({ precision: 3, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
});

export const subcategories = pgTable(
  "subcategories",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: text().notNull(),
    slug: text().notNull().unique(),
    categorySlug: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    isVisible: boolean().default(true),
  },
  (table) => [
    foreignKey({
      columns: [table.categorySlug],
      foreignColumns: [category.slug],
      name: "subcategories_categorySlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const cart = pgTable(
  "cart",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    totalPrice: doublePrecision().notNull(),
    currency: text().notNull(),
    status: cartStatus().default("PENDING").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "cart_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const itemOpinion = pgTable(
  "item_opinion",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: text().notNull(),
    itemId: text().notNull(),
    rating: integer().notNull(),
    comment: text(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "item_opinion_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [item.id],
      name: "item_opinion_itemId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: text().notNull(),
    orderId: text().notNull(),
    content: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "messages_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [order.id],
      name: "messages_orderId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const outOfStockRequest = pgTable(
  "out_of_stock_request",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    itemId: text().notNull(),
    warehouseId: text().notNull(),
    userEmail: text().notNull(),
    userName: text(),
    message: text().notNull(),
    status: outOfStockStatus().default("PENDING").notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [item.id],
      name: "out_of_stock_request_itemId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.warehouseId],
      foreignColumns: [warehouse.id],
      name: "out_of_stock_request_warehouseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const discountLevel = pgTable("discount_level", {
  id: text()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  level: integer().notNull(),
  discountPercentage: doublePrecision().notNull(),
  createdAt: timestamp({ precision: 3, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
});

export const itemDetails = pgTable(
  "item_details",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    locale: text().default("pl").notNull(),
    description: text().notNull(),
    specifications: text(),
    itemName: text().notNull(),
    seller: text(),
    discount: doublePrecision(),
    popularity: integer(),
    metaDescription: text(),
    metaKeyWords: text(),
    itemSlug: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.itemSlug],
      foreignColumns: [item.slug],
      name: "item_details_itemSlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const brand = pgTable("brand", {
  id: text()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: text().notNull(),
  alias: text().notNull().unique(),
  imageLink: text().notNull(),
  isVisible: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
});

export const itemPriceHistory = pgTable(
  "item_price_history",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    itemId: text().notNull(),
    warehouseId: text().notNull(),
    price: doublePrecision().notNull(),
    quantity: integer().notNull(),
    promotionPrice: doublePrecision(),
    promoCode: text(),
    promoStartDate: timestamp({ precision: 3, mode: "string" }),
    promoEndDate: timestamp({ precision: 3, mode: "string" }),
    badge: badge().default("ABSENT"),
    recordedAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("item_price_history_itemId_warehouseId_recordedAt_idx").using(
      "btree",
      table.itemId.asc().nullsLast().op("text_ops"),
      table.warehouseId.asc().nullsLast().op("text_ops"),
      table.recordedAt.asc().nullsLast().op("timestamp_ops")
    ),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [item.id],
      name: "item_price_history_itemId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.warehouseId],
      foreignColumns: [warehouse.id],
      name: "item_price_history_warehouseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const order = pgTable(
  "order",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
    totalPrice: text().notNull(),
    status: orderStatus().default("NEW").notNull(),
    deliveryId: text(),
    originalTotalPrice: doublePrecision().notNull(),
    lineItems: jsonb(),
    comment: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "order_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const linkedItems = pgTable(
  "linked_items",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    itemSlug: text().notNull(),
    linkedItemSlug: text().array(),
    linkedCaregorySlug: text().array(),
  },
  (table) => [
    foreignKey({
      columns: [table.itemSlug],
      foreignColumns: [item.slug],
      name: "linked_items_itemSlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ]
);

export const categoryTranslation = pgTable(
  "category_translation",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    categorySlug: text().notNull(),
    locale: text().notNull(),
    name: text().notNull(),
  },
  (table) => [
    uniqueIndex("category_translation_categorySlug_locale_key").using(
      "btree",
      table.categorySlug.asc().nullsLast().op("text_ops"),
      table.locale.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.categorySlug],
      foreignColumns: [category.slug],
      name: "category_translation_categorySlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const subcategoryTranslation = pgTable(
  "subcategory_translation",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    subCategorySlug: text().notNull(),
    locale: text().notNull(),
    name: text().notNull(),
  },
  (table) => [
    uniqueIndex("subcategory_translation_subCategorySlug_locale_key").using(
      "btree",
      table.subCategorySlug.asc().nullsLast().op("text_ops"),
      table.locale.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.subCategorySlug],
      foreignColumns: [subcategories.slug],
      name: "subcategory_translation_subCategorySlug_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const warehouseCountries = pgTable("warehouse_countries", {
  id: serial().primaryKey().notNull(),
  slug: text().notNull().unique(),
  countryCode: text().notNull(),
  phoneCode: text(),
  name: text().notNull(),
  isActive: boolean().default(true).notNull(),
});

export const itemToOrder = pgTable(
  "_ItemToOrder",
  {
    a: text("A").notNull(),
    b: text("B").notNull(),
  },
  (table) => [
    index().using("btree", table.b.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.a],
      foreignColumns: [item.id],
      name: "_ItemToOrder_A_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.b],
      foreignColumns: [order.id],
      name: "_ItemToOrder_B_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({ columns: [table.a, table.b], name: "_ItemToOrder_AB_pkey" }),
  ]
);

export const cartToItem = pgTable(
  "_CartToItem",
  {
    a: text("A").notNull(),
    b: text("B").notNull(),
  },
  (table) => [
    index().using("btree", table.b.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.a],
      foreignColumns: [cart.id],
      name: "_CartToItem_A_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.b],
      foreignColumns: [item.id],
      name: "_CartToItem_B_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({ columns: [table.a, table.b], name: "_CartToItem_AB_pkey" }),
  ]
);

export const discountLevelToUser = pgTable(
  "_DiscountLevelToUser",
  {
    a: text("A").notNull(),
    b: text("B").notNull(),
  },
  (table) => [
    index().using("btree", table.b.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.a],
      foreignColumns: [discountLevel.id],
      name: "_DiscountLevelToUser_A_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.b],
      foreignColumns: [user.id],
      name: "_DiscountLevelToUser_B_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({
      columns: [table.a, table.b],
      name: "_DiscountLevelToUser_AB_pkey",
    }),
  ]
);

export const itemPriceToItemPriceHistory = pgTable(
  "_ItemPriceToItemPriceHistory",
  {
    a: text("A").notNull(),
    b: text("B").notNull(),
  },
  (table) => [
    index().using("btree", table.b.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.a],
      foreignColumns: [itemPrice.id],
      name: "_ItemPriceToItemPriceHistory_A_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.b],
      foreignColumns: [itemPriceHistory.id],
      name: "_ItemPriceToItemPriceHistory_B_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({
      columns: [table.a, table.b],
      name: "_ItemPriceToItemPriceHistory_AB_pkey",
    }),
  ]
);

export const pageContent = pgTable(
  "page_content",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull(),
    locale: varchar("locale", { length: 5 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    isPublished: boolean("is_published").default(true),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugLocaleUnique: uniqueIndex("page_slug_locale_unique").on(
      table.slug,
      table.locale
    ),
  })
);

export const banners = pgTable(
  "banners",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }),
    imageUrl: varchar("image_url", { length: 512 }).notNull(),
    linkUrl: varchar("link_url", { length: 512 }),
    position: varchar("position", { length: 50 }).notNull(),
    // home_top | catalog_sidebar | promo
    device: varchar("device", { length: 20 })
      .notNull()
      .default("desktop"),
    // desktop | mobile
    locale: varchar("locale", { length: 5 }).notNull(),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const payment = pgTable(
  "payment",
  {
    id: text()
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    orderId: text().notNull(),
    sessionId: text(), // Przelewy24 session ID
    merchantId: text(), // Przelewy24 merchant ID
    posId: text(), // Przelewy24 POS ID
    transactionId: text(), // Przelewy24 transaction ID after payment
    amount: integer().notNull(), // Amount in grosze/cents
    currency: text().default("PLN").notNull(),
    status: paymentStatus().default("PENDING").notNull(),
    paymentMethod: text(), // Method used (card, transfer, etc.)
    p24Email: text(), // Email used in Przelewy24
    p24OrderId: text(), // Order ID sent to Przelewy24
    description: text(), // Payment description
    returnUrl: text(), // URL to return after payment
    statusUrl: text(), // URL for payment status notifications
    metadata: jsonb(), // Additional metadata
    errorCode: text(), // Error code if payment failed
    errorMessage: text(), // Error message if payment failed
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [order.id],
      name: "payment_orderId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    index("payment_orderId_idx").on(table.orderId),
    index("payment_sessionId_idx").on(table.sessionId),
    index("payment_transactionId_idx").on(table.transactionId),
  ]
);

// Type exports for use in the application
export type Badge = (typeof badge.enumValues)[number];
export type CartStatus = (typeof cartStatus.enumValues)[number];
export type Currency = (typeof currency.enumValues)[number];
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type OutOfStockStatus = (typeof outOfStockStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];

export type Item = typeof item.$inferSelect;
export type ItemInsert = typeof item.$inferInsert;
export type ItemPrice = typeof itemPrice.$inferSelect;
export type ItemPriceInsert = typeof itemPrice.$inferInsert;
export type ItemPriceHistory = typeof itemPriceHistory.$inferSelect;
export type ItemPriceHistoryInsert = typeof itemPriceHistory.$inferInsert;
export type ItemDetails = typeof itemDetails.$inferSelect;
export type ItemDetailsInsert = typeof itemDetails.$inferInsert;
export type Warehouse = typeof warehouse.$inferSelect;
export type WarehouseInsert = typeof warehouse.$inferInsert;
export type WarehouseCountries = typeof warehouseCountries.$inferSelect;
export type WarehouseCountriesInsert = typeof warehouseCountries.$inferInsert;
export type Category = typeof category.$inferSelect;
export type CategoryInsert = typeof category.$inferInsert;
export type CategoryTranslation = typeof categoryTranslation.$inferSelect;
export type CategoryTranslationInsert = typeof categoryTranslation.$inferInsert;
export type SubCategories = typeof subcategories.$inferSelect;
export type SubCategoriesInsert = typeof subcategories.$inferInsert;
export type SubcategoryTranslation = typeof subcategoryTranslation.$inferSelect;
export type SubcategoryTranslationInsert =
  typeof subcategoryTranslation.$inferInsert;
export type Brand = typeof brand.$inferSelect;
export type BrandInsert = typeof brand.$inferInsert;
export type User = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;
export type Order = typeof order.$inferSelect;
export type OrderInsert = typeof order.$inferInsert;
export type Cart = typeof cart.$inferSelect;
export type CartInsert = typeof cart.$inferInsert;
export type ItemOpinion = typeof itemOpinion.$inferSelect;
export type ItemOpinionInsert = typeof itemOpinion.$inferInsert;
export type OutOfStockRequest = typeof outOfStockRequest.$inferSelect;
export type OutOfStockRequestInsert = typeof outOfStockRequest.$inferInsert;
export type DiscountLevel = typeof discountLevel.$inferSelect;
export type DiscountLevelInsert = typeof discountLevel.$inferInsert;
export type LinkedItems = typeof linkedItems.$inferSelect;
export type LinkedItemsInsert = typeof linkedItems.$inferInsert;
export type Session = typeof session.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;
export type TwoFactor = typeof twoFactor.$inferSelect;
export type TwoFactorInsert = typeof twoFactor.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type VerificationInsert = typeof verification.$inferInsert;
export type CurrencyExchange = typeof currencyExchange.$inferSelect;
export type CurrencyExchangeInsert = typeof currencyExchange.$inferInsert;
export type Messages = typeof messages.$inferSelect;
export type MessagesInsert = typeof messages.$inferInsert;
export type Payment = typeof payment.$inferSelect;
export type PaymentInsert = typeof payment.$inferInsert;
