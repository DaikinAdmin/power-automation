ALTER TABLE "item_price" ADD COLUMN IF NOT EXISTS "initialPrice" double precision;--> statement-breakpoint
ALTER TABLE "item_price" ADD COLUMN IF NOT EXISTS "initialCurrency" "Currency";--> statement-breakpoint
ALTER TABLE "item_price_history" ADD COLUMN IF NOT EXISTS "initialPrice" double precision;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD COLUMN IF NOT EXISTS "initialCurrency" "Currency";