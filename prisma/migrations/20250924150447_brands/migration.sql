-- AlterTable
ALTER TABLE "public"."item_details" ADD COLUMN     "brandId" TEXT;

-- CreateTable
CREATE TABLE "public"."brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "imageLink" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_alias_key" ON "public"."brand"("alias");

-- AddForeignKey
ALTER TABLE "public"."item_details" ADD CONSTRAINT "item_details_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
