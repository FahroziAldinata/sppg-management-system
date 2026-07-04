/*
  Warnings:

  - You are about to drop the column `kategoriPenerimaId` on the `KelompokUmurMenu` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "KelompokUmurMenu" DROP CONSTRAINT "KelompokUmurMenu_kategoriPenerimaId_fkey";

-- AlterTable
ALTER TABLE "Akun" ADD COLUMN     "kategoriDana" "KategoriDana";

-- AlterTable
ALTER TABLE "KelompokUmurMenu" DROP COLUMN "kategoriPenerimaId";

-- CreateTable
CREATE TABLE "_KategoriPenerimaToKelompokUmurMenu" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KategoriPenerimaToKelompokUmurMenu_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_KategoriPenerimaToKelompokUmurMenu_B_index" ON "_KategoriPenerimaToKelompokUmurMenu"("B");

-- AddForeignKey
ALTER TABLE "_KategoriPenerimaToKelompokUmurMenu" ADD CONSTRAINT "_KategoriPenerimaToKelompokUmurMenu_A_fkey" FOREIGN KEY ("A") REFERENCES "KategoriPenerima"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KategoriPenerimaToKelompokUmurMenu" ADD CONSTRAINT "_KategoriPenerimaToKelompokUmurMenu_B_fkey" FOREIGN KEY ("B") REFERENCES "KelompokUmurMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
