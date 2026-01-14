CREATE TYPE "public"."Badge" AS ENUM('NEW_ARRIVALS', 'BESTSELLER', 'HOT_DEALS', 'LIMITED_EDITION', 'ABSENT');--> statement-breakpoint
CREATE TYPE "public"."CartStatus" AS ENUM('PENDING', 'CHECKED_OUT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."Currency" AS ENUM('EUR', 'UAH', 'PLN');--> statement-breakpoint
CREATE TYPE "public"."OrderStatus" AS ENUM('NEW', 'WAITING_FOR_PAYMENT', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUND', 'DELIVERY', 'ASK_FOR_PRICE');--> statement-breakpoint
CREATE TYPE "public"."OutOfStockStatus" AS ENUM('PENDING', 'PROCESSING', 'FULFILLED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"alias" text NOT NULL,
	"imageLink" text NOT NULL,
	"isVisible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "brand_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"totalPrice" double precision NOT NULL,
	"currency" text NOT NULL,
	"status" "CartStatus" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_CartToItem" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_CartToItem_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"isVisible" boolean DEFAULT true,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_translation" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categorySlug" text NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_exchange" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from" "Currency" NOT NULL,
	"to" "Currency" NOT NULL,
	"rate" double precision NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_level" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" integer NOT NULL,
	"discountPercentage" double precision NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_DiscountLevelToUser" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_DiscountLevelToUser_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"articleId" text NOT NULL,
	"slug" text NOT NULL,
	"isDisplayed" boolean DEFAULT false NOT NULL,
	"sellCounter" integer DEFAULT 0,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"warrantyLength" integer,
	"warrantyType" text,
	"brandSlug" text,
	"categorySlug" text NOT NULL,
	"itemImageLink" text[],
	"linkedItems" text[],
	CONSTRAINT "item_articleId_unique" UNIQUE("articleId"),
	CONSTRAINT "item_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "item_details" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "item_opinion" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"itemId" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_price" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "item_price_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "_ItemPriceToItemPriceHistory" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_ItemPriceToItemPriceHistory_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "_ItemToOrder" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_ItemToOrder_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "linked_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itemSlug" text NOT NULL,
	"linkedItemSlug" text[],
	"linkedCaregorySlug" text[]
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"orderId" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "out_of_stock_request" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"categorySlug" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"isVisible" boolean DEFAULT true,
	CONSTRAINT "subcategories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subcategory_translation" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subCategorySlug" text NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"phone_number" text DEFAULT '555-555-555' NOT NULL,
	"user_agreement" boolean DEFAULT false NOT NULL,
	"country_code" text DEFAULT '+48' NOT NULL,
	"company_webpage" text DEFAULT '',
	"company_name" text DEFAULT '',
	"company_role" text DEFAULT '',
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"displayedName" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"isVisible" boolean DEFAULT true,
	"countrySlug" text
);
--> statement-breakpoint
CREATE TABLE "warehouse_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"countryCode" text NOT NULL,
	"phoneCode" text,
	"name" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "warehouse_countries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_CartToItem" ADD CONSTRAINT "_CartToItem_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_CartToItem" ADD CONSTRAINT "_CartToItem_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category_translation" ADD CONSTRAINT "category_translation_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_DiscountLevelToUser" ADD CONSTRAINT "_DiscountLevelToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."discount_level"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_DiscountLevelToUser" ADD CONSTRAINT "_DiscountLevelToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_brandSlug_fkey" FOREIGN KEY ("brandSlug") REFERENCES "public"."brand"("alias") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_details" ADD CONSTRAINT "item_details_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("articleId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_opinion" ADD CONSTRAINT "item_opinion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_opinion" ADD CONSTRAINT "item_opinion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price" ADD CONSTRAINT "item_price_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price" ADD CONSTRAINT "item_price_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("articleId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemPriceToItemPriceHistory" ADD CONSTRAINT "_ItemPriceToItemPriceHistory_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."item_price"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemPriceToItemPriceHistory" ADD CONSTRAINT "_ItemPriceToItemPriceHistory_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."item_price_history"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemToOrder" ADD CONSTRAINT "_ItemToOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_ItemToOrder" ADD CONSTRAINT "_ItemToOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "linked_items" ADD CONSTRAINT "linked_items_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("articleId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "out_of_stock_request" ADD CONSTRAINT "out_of_stock_request_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "out_of_stock_request" ADD CONSTRAINT "out_of_stock_request_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subcategory_translation" ADD CONSTRAINT "subcategory_translation_subCategorySlug_fkey" FOREIGN KEY ("subCategorySlug") REFERENCES "public"."subcategories"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_countrySlug_fkey" FOREIGN KEY ("countrySlug") REFERENCES "public"."warehouse_countries"("slug") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "_CartToItem_B_index" ON "_CartToItem" USING btree ("B" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "category_translation_categorySlug_locale_key" ON "category_translation" USING btree ("categorySlug" text_ops,"locale" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "currency_exchange_from_to_key" ON "currency_exchange" USING btree ("from" enum_ops,"to" enum_ops);--> statement-breakpoint
CREATE INDEX "_DiscountLevelToUser_B_index" ON "_DiscountLevelToUser" USING btree ("B" text_ops);--> statement-breakpoint
CREATE INDEX "item_price_history_itemId_warehouseId_recordedAt_idx" ON "item_price_history" USING btree ("itemId" timestamp_ops,"warehouseId" text_ops,"recordedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "_ItemPriceToItemPriceHistory_B_index" ON "_ItemPriceToItemPriceHistory" USING btree ("B" text_ops);--> statement-breakpoint
CREATE INDEX "_ItemToOrder_B_index" ON "_ItemToOrder" USING btree ("B" text_ops);--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subcategory_translation_subCategorySlug_locale_key" ON "subcategory_translation" USING btree ("subCategorySlug" text_ops,"locale" text_ops);--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");