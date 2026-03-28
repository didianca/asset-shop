/*
  Warnings:

  - You are about to drop the `product_images` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[preview_url]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[asset_url]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `asset_url` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preview_url` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "asset_url" TEXT NOT NULL,
ADD COLUMN     "preview_url" TEXT NOT NULL;

-- DropTable
DROP TABLE "product_images";

-- CreateIndex
CREATE UNIQUE INDEX "products_preview_url_key" ON "products"("preview_url");

-- CreateIndex
CREATE UNIQUE INDEX "products_asset_url_key" ON "products"("asset_url");
