CREATE TABLE "info_pages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "info_pages_slug_locale_key" ON "info_pages" USING btree ("slug","locale");