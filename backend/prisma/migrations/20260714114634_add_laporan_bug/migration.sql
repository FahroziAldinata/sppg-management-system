-- CreateEnum
CREATE TYPE "StatusLaporanBug" AS ENUM ('BARU', 'DIPROSES', 'SELESAI');

-- CreateTable
CREATE TABLE "LaporanBug" (
    "id" TEXT NOT NULL,
    "pelaporId" TEXT NOT NULL,
    "rolePelapor" "Role" NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "status" "StatusLaporanBug" NOT NULL DEFAULT 'BARU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaporanBug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaporanBug_status_idx" ON "LaporanBug"("status");

-- CreateIndex
CREATE INDEX "LaporanBug_pelaporId_idx" ON "LaporanBug"("pelaporId");

-- AddForeignKey
ALTER TABLE "LaporanBug" ADD CONSTRAINT "LaporanBug_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
