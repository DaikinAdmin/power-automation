CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"image_url" varchar(512) NOT NULL,
	"link_url" varchar(512),
	"position" varchar(50) NOT NULL,
	"device" varchar(20) DEFAULT 'desktop' NOT NULL,
	"locale" varchar(5) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "page_content" ALTER COLUMN "content" SET DATA TYPE text;--> statement-breakpoint
CREATE UNIQUE INDEX "banner_position_device_locale_unique" ON "banners" USING btree ("position","device","locale");