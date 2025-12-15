DROP INDEX "category_slug_key";--> statement-breakpoint
DROP INDEX "subcategories_slug_key";--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_slug_unique" UNIQUE("slug");