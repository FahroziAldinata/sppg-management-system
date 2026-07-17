-- AlterTable
ALTER TABLE "TransaksiPembelian" ADD COLUMN     "diterimaAt" TIMESTAMP(3),
ADD COLUMN     "diterimaOlehId" TEXT;

-- AddForeignKey
ALTER TABLE "TransaksiPembelian" ADD CONSTRAINT "TransaksiPembelian_diterimaOlehId_fkey" FOREIGN KEY ("diterimaOlehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
