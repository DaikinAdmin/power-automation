/*
  Warnings:

  - You are about to drop the column `subCategorySlug` on the `item` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `item_price` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `warehouse` table. All the data in the column will be lost.
  - Added the required column `itemSlug` to the `item_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemSlug` to the `item_price` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_categorySlug_fkey";

-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_subCategorySlug_fkey";

-- DropForeignKey
ALTER TABLE "item_details" DROP CONSTRAINT "item_details_itemId_fkey";

-- DropForeignKey
ALTER TABLE "item_price" DROP CONSTRAINT "item_price_itemId_fkey";

-- AlterTable
ALTER TABLE "item" DROP COLUMN "subCategorySlug";

-- AlterTable
ALTER TABLE "item_details" DROP COLUMN "itemId",
ADD COLUMN     "itemSlug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "item_price" DROP COLUMN "itemId",
ADD COLUMN     "itemSlug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "warehouse" DROP COLUMN "country",
ADD COLUMN     "countrySlug" TEXT;

-- AddForeignKey
ALTER TABLE "item_price" ADD CONSTRAINT "item_price_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "item"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_details" ADD CONSTRAINT "item_details_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "item"("articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_countrySlug_fkey" FOREIGN KEY ("countrySlug") REFERENCES "warehouse_countries"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
