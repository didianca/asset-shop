-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'refund_requested';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'refund_pending';

-- RenameIndex
ALTER INDEX "products_asset_url_key" RENAME TO "products_asset_key_key";

-- RenameIndex
ALTER INDEX "products_preview_url_key" RENAME TO "products_preview_key_key";
