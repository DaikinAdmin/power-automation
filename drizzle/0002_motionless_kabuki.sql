ALTER TABLE "category_translation" DROP CONSTRAINT "category_translation_categorySlug_fkey";
--> statement-breakpoint
ALTER TABLE "subcategories" DROP CONSTRAINT "subcategories_categorySlug_fkey";
--> statement-breakpoint
ALTER TABLE "subcategory_translation" DROP CONSTRAINT "subcategory_translation_subCategorySlug_fkey";
--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "linkedItems" text[];--> statement-breakpoint
ALTER TABLE "category_translation" ADD CONSTRAINT "category_translation_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subcategory_translation" ADD CONSTRAINT "subcategory_translation_subCategorySlug_fkey" FOREIGN KEY ("subCategorySlug") REFERENCES "public"."subcategories"("slug") ON DELETE cascade ON UPDATE cascade;