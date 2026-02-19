ALTER TABLE "item_price" ADD COLUMN "margin" double precision DEFAULT 20;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD COLUMN "margin" double precision DEFAULT 20;