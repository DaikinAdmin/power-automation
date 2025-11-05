/*
  Warnings:

  - A unique constraint covering the columns `[articleId]` on the table `item` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "item_articleId_key" ON "public"."item"("articleId");
