ALTER TABLE "item_price" ADD COLUMN "initialPrice" double precision;--> statement-breakpoint
ALTER TABLE "item_price" ADD COLUMN "initialCurrency" "Currency";--> statement-breakpoint
ALTER TABLE "item_price_history" ADD COLUMN "initialPrice" double precision;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD COLUMN "initialCurrency" "Currency";