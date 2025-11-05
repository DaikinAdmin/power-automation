/*
  Warnings:

  - You are about to drop the column `categoryId` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `subCategoryId` on the `item_details` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subCategoryId` to the `item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."item_details" DROP CONSTRAINT "item_details_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."item_details" DROP CONSTRAINT "item_details_subCategoryId_fkey";

-- AlterTable
ALTER TABLE "public"."item" ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "subCategoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."item_details" DROP COLUMN "categoryId",
DROP COLUMN "subCategoryId";

-- AddForeignKey
ALTER TABLE "public"."item" ADD CONSTRAINT "item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."item" ADD CONSTRAINT "item_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
