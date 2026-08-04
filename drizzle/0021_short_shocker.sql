CREATE TABLE "ad_click" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitorId" text NOT NULL,
	"gclid" text NOT NULL,
	"gaClientId" text,
	"utmSource" text,
	"utmMedium" text,
	"utmCampaign" text,
	"utmTerm" text,
	"utmContent" text,
	"landingPage" text NOT NULL,
	"referrer" text,
	"userAgent" text,
	"domain" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ad_click_gclid_idx" ON "ad_click" USING btree ("gclid");--> statement-breakpoint
CREATE INDEX "ad_click_gaClientId_idx" ON "ad_click" USING btree ("gaClientId");