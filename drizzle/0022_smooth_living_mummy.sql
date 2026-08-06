CREATE TYPE "public"."OrderMethod" AS ENUM('QUICK', 'ACCOUNT');--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "discountAmount" double precision;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "orderMethod" "OrderMethod";--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "gclid" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "gaClientId" text;