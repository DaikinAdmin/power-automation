/*
  Warnings:

  - You are about to drop the column `categorySlug` on the `item_details` table. All the data in the column will be lost.
  - You are about to drop the column `subCategorySlug` on the `item_details` table. All the data in the column will be lost.
  - Added the required column `categorySlug` to the `item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subCategorySlug` to the `item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."item_details" DROP CONSTRAINT "item_details_categorySlug_fkey";

-- DropForeignKey
ALTER TABLE "public"."item_details" DROP CONSTRAINT "item_details_subCategorySlug_fkey";

-- AlterTable
ALTER TABLE "public"."item" ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD COLUMN     "subCategorySlug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."item_details" DROP COLUMN "categorySlug",
DROP COLUMN "subCategorySlug";

-- AddForeignKey
ALTER TABLE "public"."item" ADD CONSTRAINT "item_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."item" ADD CONSTRAINT "item_subCategorySlug_fkey" FOREIGN KEY ("subCategorySlug") REFERENCES "public"."subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
