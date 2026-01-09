ALTER TABLE "page_content" ALTER COLUMN "content" SET DATA TYPE jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "page_slug_locale_unique" ON "page_content" USING btree ("slug","locale");