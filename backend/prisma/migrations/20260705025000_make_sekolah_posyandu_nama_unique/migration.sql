-- CreateIndex
CREATE UNIQUE INDEX "Sekolah_nama_lower_idx" ON "Sekolah" (lower("nama"));

-- CreateIndex
CREATE UNIQUE INDEX "Posyandu_nama_lower_idx" ON "Posyandu" (lower("nama"));
