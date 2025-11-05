/*
  Warnings:

  - Added the required column `originalTotalPrice` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."order" ADD COLUMN     "originalTotalPrice" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "totalPrice" SET DATA TYPE TEXT;
