CREATE TYPE "public"."DeliveryType" AS ENUM('PICKUP', 'USER_ADDRESS', 'NOVA_POSHTA', 'COURIER');
--> statement-breakpoint
CREATE TYPE "public"."DeliveryStatus" AS ENUM('PENDING', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED');
--> statement-breakpoint
CREATE TABLE "delivery" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"userId" text NOT NULL,
	"orderId" text,
	"type" "DeliveryType" NOT NULL,
	"city" text,
	"city_ref" text,
	"warehouse_ref" text,
	"warehouse_desc" text,
	"street" text,
	"building" text,
	"flat" text,
	"tracking_number" text,
	"payment_method" text,
	"status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery" ADD CONSTRAINT "delivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX "delivery_userId_idx" ON "delivery" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "delivery_orderId_idx" ON "delivery" USING btree ("orderId");
