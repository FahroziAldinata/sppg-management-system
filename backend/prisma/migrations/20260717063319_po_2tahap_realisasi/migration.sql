/*
  Warnings:

  - Added the required column `createdById` to the `TransaksiPembelian` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusPO" AS ENUM ('DIAJUKAN', 'DIREALISASI', 'DITERIMA');

-- AlterTable
ALTER TABLE "TransaksiPembelian" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "status" "StatusPO" NOT NULL DEFAULT 'DIAJUKAN';

-- AlterTable
ALTER TABLE "TransaksiPembelianItem" ADD COLUMN     "hargaSatuanRealisasi" DECIMAL(12,2),
ADD COLUMN     "qtyDiterima" DECIMAL(10,3),
ADD COLUMN     "qtyRealisasi" DECIMAL(10,3),
ADD COLUMN     "subtotalRealisasi" DECIMAL(14,2);

-- AddForeignKey
ALTER TABLE "TransaksiPembelian" ADD CONSTRAINT "TransaksiPembelian_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
