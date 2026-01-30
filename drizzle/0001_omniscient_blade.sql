CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" text NOT NULL,
	"sessionId" text,
	"merchantId" text,
	"posId" text,
	"transactionId" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'PLN' NOT NULL,
	"status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"paymentMethod" text,
	"p24Email" text,
	"p24OrderId" text,
	"description" text,
	"returnUrl" text,
	"statusUrl" text,
	"metadata" jsonb,
	"errorCode" text,
	"errorMessage" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_details" DROP CONSTRAINT "item_details_itemSlug_fkey";
--> statement-breakpoint
ALTER TABLE "item_price" DROP CONSTRAINT "item_price_itemSlug_fkey";
--> statement-breakpoint
ALTER TABLE "linked_items" DROP CONSTRAINT "linked_items_itemSlug_fkey";
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "payment_orderId_idx" ON "payment" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "payment_sessionId_idx" ON "payment" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "payment_transactionId_idx" ON "payment" USING btree ("transactionId");--> statement-breakpoint
ALTER TABLE "item_details" ADD CONSTRAINT "item_details_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_price" ADD CONSTRAINT "item_price_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "linked_items" ADD CONSTRAINT "linked_items_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "public"."item"("slug") ON DELETE restrict ON UPDATE cascade;