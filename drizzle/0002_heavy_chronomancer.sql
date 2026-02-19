-- Add USED value to Badge enum if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'USED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Badge')
  ) THEN
    ALTER TYPE "public"."Badge" ADD VALUE 'USED';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "item_price" ADD COLUMN "promoStartDate" timestamp(3);--> statement-breakpoint
ALTER TABLE "item_price_history" ADD COLUMN "promoStartDate" timestamp(3);