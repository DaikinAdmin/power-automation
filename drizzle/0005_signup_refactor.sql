ALTER TABLE "user" DROP COLUMN "company_webpage";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "company_role";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "user_type" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vat_number" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "address_line" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "country" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "company_position" text DEFAULT '';
