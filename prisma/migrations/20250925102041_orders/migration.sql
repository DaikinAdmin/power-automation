-- AlterEnum
ALTER TYPE "public"."OrderStatus" ADD VALUE 'DELIVERY';

-- AlterTable
ALTER TABLE "public"."order" ADD COLUMN     "lineItems" JSONB;
