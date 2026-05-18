ALTER TABLE "delivery" ADD COLUMN "delivery_price" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "grossWeight" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "heightPacking" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "widthPacking" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "lengthPacking" double precision;