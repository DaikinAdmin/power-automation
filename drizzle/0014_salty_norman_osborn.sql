--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "currency" text NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "totalNet" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "totalVat" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "totalGross" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "totalPrice";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "originalTotalPrice";