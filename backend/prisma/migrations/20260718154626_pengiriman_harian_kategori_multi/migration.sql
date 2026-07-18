/*
  Warnings:

  - You are about to drop the column `jenisPorsi` on the `PengirimanHarian` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PengirimanHarian_menuHarianId_jenisPorsi_key";

-- AlterTable
ALTER TABLE "PengirimanHarian" DROP COLUMN "jenisPorsi";

-- CreateTable
CREATE TABLE "_KategoriPenerimaToPengirimanHarian" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KategoriPenerimaToPengirimanHarian_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_KategoriPenerimaToPengirimanHarian_B_index" ON "_KategoriPenerimaToPengirimanHarian"("B");

-- AddForeignKey
ALTER TABLE "_KategoriPenerimaToPengirimanHarian" ADD CONSTRAINT "_KategoriPenerimaToPengirimanHarian_A_fkey" FOREIGN KEY ("A") REFERENCES "KategoriPenerima"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KategoriPenerimaToPengirimanHarian" ADD CONSTRAINT "_KategoriPenerimaToPengirimanHarian_B_fkey" FOREIGN KEY ("B") REFERENCES "PengirimanHarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
