ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "_prisma_migrations" CASCADE;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_slug_unique" UNIQUE("slug");