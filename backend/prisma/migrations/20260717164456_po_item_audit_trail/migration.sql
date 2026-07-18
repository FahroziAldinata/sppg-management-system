-- AlterTable
ALTER TABLE "TransaksiPembelianItem" ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT;

-- AddForeignKey
ALTER TABLE "TransaksiPembelianItem" ADD CONSTRAINT "TransaksiPembelianItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
