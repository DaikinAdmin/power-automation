/*
  Warnings:

  - You are about to drop the column `brandId` on the `item` table. All the data in the column will be lost.
  - You are about to drop the column `brandName` on the `item` table. All the data in the column will be lost.
  - You are about to drop the column `categorySlug` on the `item` table. All the data in the column will be lost.
  - You are about to drop the column `subCategorySlug` on the `item` table. All the data in the column will be lost.
  - The `itemImageLink` column on the `item` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[slug]` on the table `category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `subcategories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categorySlug` to the `item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subCategorySlug` to the `item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_brandId_fkey";

-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_categorySlug_fkey";

-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_subCategorySlug_fkey";

-- AlterTable
ALTER TABLE "item" DROP COLUMN "brandId",
DROP COLUMN "brandName",
DROP COLUMN "categorySlug",
DROP COLUMN "subCategorySlug",
ADD COLUMN     "brandSlug" TEXT,
ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD COLUMN     "subCategorySlug" TEXT NOT NULL,
DROP COLUMN "itemImageLink",
ADD COLUMN     "itemImageLink" TEXT[];

-- AlterTable
ALTER TABLE "item_details" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaKeyWords" TEXT;

-- CreateTable
CREATE TABLE "linked_items" (
    "id" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "linkedItemSlug" TEXT[],
    "linkedCaregorySlug" TEXT[],

    CONSTRAINT "linked_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translation" (
    "id" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "category_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategory_translation" (
    "id" TEXT NOT NULL,
    "subCategorySlug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "subcategory_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_countries" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phoneCode" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "warehouse_countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_translation_categorySlug_locale_key" ON "category_translation"("categorySlug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_translation_subCategorySlug_locale_key" ON "subcategory_translation"("subCategorySlug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_countries_slug_key" ON "warehouse_countries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_slug_key" ON "subcategories"("slug");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "category"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_subCategorySlug_fkey" FOREIGN KEY ("subCategorySlug") REFERENCES "subcategories"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_brandSlug_fkey" FOREIGN KEY ("brandSlug") REFERENCES "brand"("alias") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_items" ADD CONSTRAINT "linked_items_itemSlug_fkey" FOREIGN KEY ("itemSlug") REFERENCES "item"("articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translation" ADD CONSTRAINT "category_translation_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_translation" ADD CONSTRAINT "subcategory_translation_subCategorySlug_fkey" FOREIGN KEY ("subCategorySlug") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
