/*
  Warnings:

  - You are about to drop the column `badge` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `brandId` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `brandName` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `warrantyLength` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `warrantyType` on the `item_details` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."item_details" DROP CONSTRAINT "item_details_brandId_fkey";

-- AlterTable
ALTER TABLE "public"."item" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "warrantyLength" INTEGER,
ADD COLUMN     "warrantyType" TEXT;

-- AlterTable
ALTER TABLE "public"."item_details" DROP COLUMN "badge",
DROP COLUMN "brandId",
DROP COLUMN "brandName",
DROP COLUMN "warrantyLength",
DROP COLUMN "warrantyType";

-- AlterTable
ALTER TABLE "public"."item_price" ADD COLUMN     "badge" "public"."Badge" DEFAULT 'ABSENT';

-- CreateTable
CREATE TABLE "public"."item_price_history" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "promotionPrice" DOUBLE PRECISION,
    "promoCode" TEXT,
    "promoEndDate" TIMESTAMP(3),
    "badge" "public"."Badge" DEFAULT 'ABSENT',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ItemPriceToItemPriceHistory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ItemPriceToItemPriceHistory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "item_price_history_itemId_warehouseId_recordedAt_idx" ON "public"."item_price_history"("itemId", "warehouseId", "recordedAt");

-- CreateIndex
CREATE INDEX "_ItemPriceToItemPriceHistory_B_index" ON "public"."_ItemPriceToItemPriceHistory"("B");

-- AddForeignKey
ALTER TABLE "public"."item" ADD CONSTRAINT "item_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."item_price_history" ADD CONSTRAINT "item_price_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."item_price_history" ADD CONSTRAINT "item_price_history_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ItemPriceToItemPriceHistory" ADD CONSTRAINT "_ItemPriceToItemPriceHistory_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."item_price"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ItemPriceToItemPriceHistory" ADD CONSTRAINT "_ItemPriceToItemPriceHistory_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."item_price_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
