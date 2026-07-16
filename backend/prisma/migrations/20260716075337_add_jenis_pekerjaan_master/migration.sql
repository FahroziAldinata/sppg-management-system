-- AlterTable
ALTER TABLE "DaftarNominatifUpah" ADD COLUMN     "tarifHarian" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "JenisPekerjaan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tarifHarian" DECIMAL(12,2) NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JenisPekerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JenisPekerjaan_nama_key" ON "JenisPekerjaan"("nama");
