-- CreateTable
CREATE TABLE "HariLibur" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "HariLibur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HariLibur_tanggal_key" ON "HariLibur"("tanggal");
