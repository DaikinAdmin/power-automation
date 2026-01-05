DROP INDEX "item_price_history_itemId_warehouseId_recordedAt_idx";--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "imageLink" text;--> statement-breakpoint
CREATE INDEX "item_price_history_itemId_warehouseId_recordedAt_idx" ON "item_price_history" USING btree ("itemId" text_ops,"warehouseId" text_ops,"recordedAt" timestamp_ops);--> statement-breakpoint
ALTER TABLE "warehouse_countries" ADD CONSTRAINT "warehouse_countries_slug_unique" UNIQUE("slug");