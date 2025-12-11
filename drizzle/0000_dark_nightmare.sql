-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."Badge" AS ENUM('NEW_ARRIVALS', 'BESTSELLER', 'HOT_DEALS', 'LIMITED_EDITION', 'ABSENT');--> statement-breakpoint
CREATE TYPE "public"."CartStatus" AS ENUM('PENDING', 'CHECKED_OUT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."Currency" AS ENUM('EUR', 'UAH', 'PLN');--> statement-breakpoint
CREATE TYPE "public"."OrderStatus" AS ENUM('NEW', 'WAITING_FOR_PAYMENT', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUND', 'DELIVERY', 'ASK_FOR_PRICE');--> statement-breakpoint
CREATE TYPE "public"."OutOfStockStatus" AS ENUM('PENDING', 'PROCESSING', 'FULFILLED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "currency_exchange" (
	"id" text PRIMARY KEY NOT NULL,
	"from" "Currency" NOT NULL,
	"to" "Currency" NOT NULL,
	"rate" double precision NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_price" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouseId" text NOT NULL,
	"price" double precision NOT NULL,
	"quantity" integer NOT NULL,
	"promotionPrice" double precision,
	"promoCode" text,
	"promoEndDate" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"badge" "Badge" DEFAULT 'ABSENT',
	"itemSlug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"displayedName" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"isVisible" boolean DEFAULT true,
	"countrySlug" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phoneNumber" text DEFAULT '' NOT NULL,
	"companyName" text,
	"companyWebpage" text,
	"companyRole" text,
	"countryCode" text,
	"userAgreement" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"twoFactorEnabled" boolean DEFAULT false NOT NULL,
	"username" text,
	"displayUsername" text,
	"discountLevel" integer,
	"role" text DEFAULT 'user' NOT NULL,
	"banExpires" timestamp(3),
	"banReason" text,
	"banned" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"token" text NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"expiresAt" timestamp(3),
	"password" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"accessTokenExpiresAt" timestamp(3),
	"refreshTokenExpiresAt" timestamp(3),
	"scope" text
);
--> statement-breakpoint
CREATE TABLE "twoFactor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" text PRIMARY KEY NOT NULL,
	"articleId" text NOT NULL,
	"isDisplayed" boolean DEFAULT false NOT NULL,
	"sellCounter" integer DEFAULT 0,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"warrantyLength" integer,
	"warrantyType" text,
	"brandSlug" text,
	"categorySlug" text NOT NULL,
	"itemImageLink" text[]
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"isVisible" boolean DEFAULT true,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"categorySlug" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"isVisible" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"totalPrice" double precision NOT NULL,
	"currency" text NOT NULL,
	"status" "CartStatus" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_opinion" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"itemId" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"orderId" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "out_of_stock_request" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"warehouseId" text NOT NULL,
	"userEmail" text NOT NULL,
	"userName" text,
	"message" text NOT NULL,
	"status" "OutOfStockStatus" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_level" (
	"id" text PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"discountPercentage" double precision NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_details" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text DEFAULT 'pl' NOT NULL,
	"description" text NOT NULL,
	"specifications" text,
	"itemName" text NOT NULL,
	"seller" text,
	"discount" double precision,
	"popularity" integer,
	"metaDescription" text,
	"metaKeyWords" text,
	"itemSlug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alias" text NOT NULL,
	"imageLink" text NOT NULL,
	"isVisible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_price_history" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"warehouseId" text NOT NULL,
	"price" double precision NOT NULL,
	"quantity" integer NOT NULL,
	"promotionPrice" double precision,
	"promoCode" text,
	"promoEndDate" timestamp(3),
	"badge" "Badge" DEFAULT 'ABSENT',
	"recordedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"totalPrice" text NOT NULL,
	"status" "OrderStatus" DEFAULT 'NEW' NOT NULL,
	"deliveryId" text,
	"originalTotalPrice" double precision NOT NULL,
	"lineItems" jsonb,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "linked_items" (
	"id" text PRIMARY KEY NOT NULL,
	"itemSlug" text NOT NULL,
	"linkedItemSlug" text[],
	"linkedCaregorySlug" text[]
);
--> statement-breakpoint
CREATE TABLE "category_translation" (
	"id" text PRIMARY KEY NOT NULL,
	"categorySlug" text NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategory_translation" (
	"id" text PRIMARY KEY NOT NULL,
	"subCategorySlug" text NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"countryCode" text NOT NULL,
	"phoneCode" text,
	"name" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_ItemToOrder" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_ItemToOrder_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "_CartToItem" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_CartToItem_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "_DiscountLevelToUser" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_DiscountLevelToUser_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "_ItemPriceToItemPriceHistory" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_ItemPriceToItemPriceHistory_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
ALTER TABLE "item_price" ADD CONSTRAINT "item_price_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price" ADD CONSTRAINT "item_price_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("articleId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_countrySlug_fkey" FOREIGN KEY ("countrySlug") REFERENCES "public"."warehouse_countries"("slug") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_brandSlug_fkey" FOREIGN KEY ("brandSlug") REFERENCES "public"."brand"("alias") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_opinion" ADD CONSTRAINT "item_opinion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_opinion" ADD CONSTRAINT "item_opinion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "out_of_stock_request" ADD CONSTRAINT "out_of_stock_request_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "out_of_stock_request" ADD CONSTRAINT "out_of_stock_request_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_details" ADD CONSTRAINT "item_details_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("articleId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "linked_items" ADD CONSTRAINT "linked_items_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("articleId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category_translation" ADD CONSTRAINT "category_translation_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subcategory_translation" ADD CONSTRAINT "subcategory_translation_subCategorySlug_fkey" FOREIGN KEY ("subCategorySlug") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemToOrder" ADD CONSTRAINT "_ItemToOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemToOrder" ADD CONSTRAINT "_ItemToOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_CartToItem" ADD CONSTRAINT "_CartToItem_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_CartToItem" ADD CONSTRAINT "_CartToItem_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_DiscountLevelToUser" ADD CONSTRAINT "_DiscountLevelToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."discount_level"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_DiscountLevelToUser" ADD CONSTRAINT "_DiscountLevelToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemPriceToItemPriceHistory" ADD CONSTRAINT "_ItemPriceToItemPriceHistory_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."item_price"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemPriceToItemPriceHistory" ADD CONSTRAINT "_ItemPriceToItemPriceHistory_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."item_price_history"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "currency_exchange_from_to_key" ON "currency_exchange" USING btree ("from" enum_ops,"to" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "category_slug_key" ON "category" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "subcategories_slug_key" ON "subcategories" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "item_price_history_itemId_warehouseId_recordedAt_idx" ON "item_price_history" USING btree ("itemId" timestamp_ops,"warehouseId" text_ops,"recordedAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "category_translation_categorySlug_locale_key" ON "category_translation" USING btree ("categorySlug" text_ops,"locale" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "subcategory_translation_subCategorySlug_locale_key" ON "subcategory_translation" USING btree ("subCategorySlug" text_ops,"locale" text_ops);--> statement-breakpoint
CREATE INDEX "_ItemToOrder_B_index" ON "_ItemToOrder" USING btree ("B" text_ops);--> statement-breakpoint
CREATE INDEX "_CartToItem_B_index" ON "_CartToItem" USING btree ("B" text_ops);--> statement-breakpoint
CREATE INDEX "_DiscountLevelToUser_B_index" ON "_DiscountLevelToUser" USING btree ("B" text_ops);--> statement-breakpoint
CREATE INDEX "_ItemPriceToItemPriceHistory_B_index" ON "_ItemPriceToItemPriceHistory" USING btree ("B" text_ops);
*/