-- AlterTable
ALTER TABLE "BahanPokok" ADD COLUMN     "konversiPerKg" DECIMAL(10,3),
ADD COLUMN     "satuanHitungan" TEXT;

-- AlterTable
ALTER TABLE "MenuItemBahan" ADD COLUMN     "jumlahHitungan" DECIMAL(10,2);
