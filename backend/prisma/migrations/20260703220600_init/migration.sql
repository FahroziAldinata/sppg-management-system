-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG');

-- CreateEnum
CREATE TYPE "StatusPeriode" AS ENUM ('DRAFT', 'AKTIF', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusApproval" AS ENUM ('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "AksiAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'KOREKSI');

-- CreateEnum
CREATE TYPE "TipeAkun" AS ENUM ('KAS', 'DANA', 'BIAYA', 'PAJAK');

-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "KategoriDana" AS ENUM ('BAHAN_MAKANAN', 'OPERASIONAL', 'INSENTIF_FASILITAS');

-- CreateEnum
CREATE TYPE "JenisPorsi" AS ENUM ('KECIL', 'BESAR');

-- CreateEnum
CREATE TYPE "JenisSasaran" AS ENUM ('PESERTA_DIDIK', 'NON_PESERTA_DIDIK');

-- CreateEnum
CREATE TYPE "JenisPenerimaKeluar" AS ENUM ('SISWA', 'B3');

-- CreateEnum
CREATE TYPE "JalurMenu" AS ENUM ('SISWA', 'TIGA_B');

-- CreateEnum
CREATE TYPE "HariMenu" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU');

-- CreateEnum
CREATE TYPE "KomponenMenu" AS ENUM ('KARBOHIDRAT', 'LAUK_HEWANI', 'LAUK_NABATI', 'SAYUR', 'BUAH');

-- CreateEnum
CREATE TYPE "TipePenyimpanan" AS ENUM ('HABIS_HARI_ITU', 'STOK_GUDANG');

-- CreateEnum
CREATE TYPE "JenisMutasiStok" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "JenisDokumenResmi" AS ENUM ('LPA', 'SPTJ', 'BAPSD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periode" (
    "id" TEXT NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE NOT NULL,
    "status" "StatusPeriode" NOT NULL DEFAULT 'DRAFT',
    "anggaranAlokasi" DECIMAL(14,2) NOT NULL,
    "totalDanaDiterima" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Periode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupLembaga" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "namaLembaga" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "namaKepalaSPPG" TEXT NOT NULL,
    "namaAkuntanSPPG" TEXT NOT NULL,
    "namaYayasan" TEXT NOT NULL,
    "ketuaYayasan" TEXT NOT NULL,
    "nomorRekeningVA" TEXT NOT NULL,
    "tahunAnggaran" INTEGER NOT NULL,
    "awalPeriodeBerikutnya" DATE NOT NULL,
    "tanggalPelaporan" DATE NOT NULL,
    "tempatPelaporan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupLembaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatasHargaPorsi" (
    "id" TEXT NOT NULL,
    "jenisPorsi" "JenisPorsi" NOT NULL,
    "batasMaksimal" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatasHargaPorsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KategoriPenerima" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenisSasaran" "JenisSasaran" NOT NULL,
    "jenisPorsi" "JenisPorsi",
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KategoriPenerima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KelompokUmurMenu" (
    "id" TEXT NOT NULL,
    "jalur" "JalurMenu" NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "rentangUsia" TEXT,
    "kategoriPenerimaId" TEXT,

    CONSTRAINT "KelompokUmurMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sekolah" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "npsn" TEXT,
    "alamat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Posyandu" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Posyandu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputPenerimaManfaat" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "hariAktif" "HariMenu"[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InputPenerimaManfaat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputPenerimaManfaatDetail" (
    "id" TEXT NOT NULL,
    "inputPenerimaManfaatId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "sekolahId" TEXT,
    "posyanduId" TEXT,
    "lakiLaki" INTEGER NOT NULL,
    "perempuan" INTEGER NOT NULL,

    CONSTRAINT "InputPenerimaManfaatDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SekolahKelasDetail" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "namaKelas" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,

    CONSTRAINT "SekolahKelasDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HargaPaketKategoriPeriode" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "hargaSatuan" DECIMAL(12,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HargaPaketKategoriPeriode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BahanPokok" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "tipePenyimpanan" "TipePenyimpanan" NOT NULL DEFAULT 'HABIS_HARI_ITU',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BahanPokok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HargaBahanPeriode" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "harga" DECIMAL(12,2) NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HargaBahanPeriode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldoAwalBarang" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "saldoAwalQty" DECIMAL(10,3) NOT NULL,
    "hargaBeliAwal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaldoAwalBarang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutasiStok" (
    "id" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jenis" "JenisMutasiStok" NOT NULL,
    "qty" DECIMAL(10,3) NOT NULL,
    "keterangan" TEXT,
    "supplierId" TEXT,
    "hargaBeli" DECIMAL(12,2),
    "kelompokPenerima" "JenisPenerimaKeluar",
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutasiStok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterMenuMingguan" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "jalur" "JalurMenu" NOT NULL,
    "hari" "HariMenu" NOT NULL,
    "menuKarbohidrat" TEXT NOT NULL,
    "menuLaukHewani" TEXT NOT NULL,
    "menuLaukNabati" TEXT NOT NULL,
    "menuSayur" TEXT NOT NULL,
    "menuBuah" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterMenuMingguan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuHarian" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusApproval" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuHarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kendaraan" (
    "id" TEXT NOT NULL,
    "namaKendaraan" TEXT NOT NULL,
    "platNomor" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Kendaraan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengirimanHarian" (
    "id" TEXT NOT NULL,
    "menuHarianId" TEXT NOT NULL,
    "jenisPorsi" "JenisPorsi" NOT NULL,
    "kendaraanId" TEXT NOT NULL,
    "catatan" TEXT,

    CONSTRAINT "PengirimanHarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuHarianBlok" (
    "id" TEXT NOT NULL,
    "menuHarianId" TEXT NOT NULL,
    "kelompokUmurMenuId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuHarianBlok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlergiCatatan" (
    "id" TEXT NOT NULL,
    "blokId" TEXT NOT NULL,
    "jenisAlergi" TEXT NOT NULL,
    "jumlahSiswa" INTEGER NOT NULL,
    "bahanPengganti" TEXT,

    CONSTRAINT "AlergiCatatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "blokId" TEXT NOT NULL,
    "namaMenu" TEXT NOT NULL,
    "komponen" "KomponenMenu",

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemBahan" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "beratBersihGr" DECIMAL(10,2) NOT NULL,
    "beratURT" TEXT,
    "energiKkal" DECIMAL(10,2) NOT NULL,
    "proteinGr" DECIMAL(10,2) NOT NULL,
    "lemakGr" DECIMAL(10,2) NOT NULL,
    "karbohidratGr" DECIMAL(10,2) NOT NULL,
    "seratGr" DECIMAL(10,2) NOT NULL,
    "bddPersen" DECIMAL(5,2) NOT NULL,
    "beratKotorGr" DECIMAL(10,2) NOT NULL,
    "hargaSatuan" DECIMAL(12,2) NOT NULL,
    "beratSatuanGr" DECIMAL(10,2) NOT NULL,
    "totalHargaBahan" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "MenuItemBahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuTargetGizi" (
    "id" TEXT NOT NULL,
    "blokId" TEXT NOT NULL,
    "targetEnergi" DECIMAL(10,2) NOT NULL,
    "targetProtein" DECIMAL(10,2) NOT NULL,
    "targetLemak" DECIMAL(10,2) NOT NULL,
    "targetKarbohidrat" DECIMAL(10,2) NOT NULL,
    "targetSerat" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "MenuTargetGizi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuOrganoleptik" (
    "id" TEXT NOT NULL,
    "blokId" TEXT NOT NULL,
    "rasa" TEXT NOT NULL,
    "aroma" TEXT NOT NULL,
    "tekstur" TEXT NOT NULL,
    "suhuSaji" TEXT NOT NULL,
    "catatan" TEXT,
    "ujiPadaTanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuOrganoleptik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RabHarian" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusApproval" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RabHarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kontak" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiPembelian" (
    "id" TEXT NOT NULL,
    "rabHarianId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransaksiPembelian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiPembelianItem" (
    "id" TEXT NOT NULL,
    "transaksiId" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "qty" DECIMAL(10,3) NOT NULL,
    "hargaSatuan" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "TransaksiPembelianItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnggaranHarian" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "kategoriDana" "KategoriDana" NOT NULL,
    "jumlahPaket" INTEGER NOT NULL,
    "hargaSatuan" DECIMAL(12,2),
    "rab" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "aktual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "selisih" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnggaranHarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnggaranBahanMakananDetail" (
    "id" TEXT NOT NULL,
    "anggaranHarianId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "jumlahPaket" INTEGER NOT NULL,
    "hargaSatuan" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "AnggaranBahanMakananDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Akun" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeAkun" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Akun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldoAwalPeriode" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "akunId" TEXT NOT NULL,
    "saldoAwal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaldoAwalPeriode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurnalTransaksi" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "nomorBukti" INTEGER NOT NULL,
    "uraian" TEXT NOT NULL,
    "jenis" "JenisTransaksi" NOT NULL,
    "nominal" DECIMAL(14,2) NOT NULL,
    "akunDanaBiayaId" TEXT NOT NULL,
    "akunKasId" TEXT NOT NULL,
    "tagPengeluaran" TEXT,
    "transaksiPembelianId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurnalTransaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumenResmi" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "jenisDokumen" "JenisDokumenResmi" NOT NULL,
    "nomorDokumen" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DokumenResmi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaftarNominatifUpah" (
    "id" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "jenisPekerjaan" TEXT NOT NULL,
    "namaRelawan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "danaKesehatan" DECIMAL(12,2),
    "tk" DECIMAL(12,2),
    "pj" DECIMAL(12,2),

    CONSTRAINT "DaftarNominatifUpah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaftarNominatifUpahHarian" (
    "id" TEXT NOT NULL,
    "daftarNominatifId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "nominal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DaftarNominatifUpahHarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "menuHarianId" TEXT,
    "rabHarianId" TEXT,
    "status" "StatusApproval" NOT NULL,
    "catatan" TEXT,
    "approvedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidasiStok" (
    "id" TEXT NOT NULL,
    "bahanPokokId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "qtyDibeli" DECIMAL(10,3) NOT NULL,
    "qtyTerpakai" DECIMAL(10,3) NOT NULL,
    "selisih" DECIMAL(10,3) NOT NULL,
    "catatan" TEXT,
    "validatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidasiStok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "aksi" "AksiAudit" NOT NULL,
    "dataLama" JSONB,
    "dataBaru" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Periode_tanggalMulai_tanggalSelesai_idx" ON "Periode"("tanggalMulai", "tanggalSelesai");

-- CreateIndex
CREATE UNIQUE INDEX "SetupLembaga_periodeId_key" ON "SetupLembaga"("periodeId");

-- CreateIndex
CREATE UNIQUE INDEX "BatasHargaPorsi_jenisPorsi_key" ON "BatasHargaPorsi"("jenisPorsi");

-- CreateIndex
CREATE UNIQUE INDEX "KategoriPenerima_kode_key" ON "KategoriPenerima"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "KelompokUmurMenu_kode_key" ON "KelompokUmurMenu"("kode");

-- CreateIndex
CREATE INDEX "InputPenerimaManfaat_periodeId_idx" ON "InputPenerimaManfaat"("periodeId");

-- CreateIndex
CREATE INDEX "InputPenerimaManfaatDetail_inputPenerimaManfaatId_kategoriI_idx" ON "InputPenerimaManfaatDetail"("inputPenerimaManfaatId", "kategoriId");

-- CreateIndex
CREATE UNIQUE INDEX "SekolahKelasDetail_periodeId_sekolahId_namaKelas_key" ON "SekolahKelasDetail"("periodeId", "sekolahId", "namaKelas");

-- CreateIndex
CREATE UNIQUE INDEX "HargaPaketKategoriPeriode_periodeId_kategoriId_key" ON "HargaPaketKategoriPeriode"("periodeId", "kategoriId");

-- CreateIndex
CREATE UNIQUE INDEX "BahanPokok_nama_key" ON "BahanPokok"("nama");

-- CreateIndex
CREATE INDEX "BahanPokok_nama_idx" ON "BahanPokok"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "HargaBahanPeriode_periodeId_bahanPokokId_key" ON "HargaBahanPeriode"("periodeId", "bahanPokokId");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoAwalBarang_periodeId_bahanPokokId_key" ON "SaldoAwalBarang"("periodeId", "bahanPokokId");

-- CreateIndex
CREATE INDEX "MutasiStok_bahanPokokId_tanggal_idx" ON "MutasiStok"("bahanPokokId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "MasterMenuMingguan_periodeId_jalur_hari_key" ON "MasterMenuMingguan"("periodeId", "jalur", "hari");

-- CreateIndex
CREATE UNIQUE INDEX "MenuHarian_periodeId_tanggal_key" ON "MenuHarian"("periodeId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "PengirimanHarian_menuHarianId_jenisPorsi_key" ON "PengirimanHarian"("menuHarianId", "jenisPorsi");

-- CreateIndex
CREATE UNIQUE INDEX "MenuHarianBlok_menuHarianId_kelompokUmurMenuId_key" ON "MenuHarianBlok"("menuHarianId", "kelompokUmurMenuId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuTargetGizi_blokId_key" ON "MenuTargetGizi"("blokId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuOrganoleptik_blokId_key" ON "MenuOrganoleptik"("blokId");

-- CreateIndex
CREATE UNIQUE INDEX "RabHarian_periodeId_tanggal_key" ON "RabHarian"("periodeId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "AnggaranHarian_periodeId_tanggal_kategoriDana_key" ON "AnggaranHarian"("periodeId", "tanggal", "kategoriDana");

-- CreateIndex
CREATE UNIQUE INDEX "AnggaranBahanMakananDetail_anggaranHarianId_kategoriId_key" ON "AnggaranBahanMakananDetail"("anggaranHarianId", "kategoriId");

-- CreateIndex
CREATE UNIQUE INDEX "Akun_kode_key" ON "Akun"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoAwalPeriode_periodeId_akunId_key" ON "SaldoAwalPeriode"("periodeId", "akunId");

-- CreateIndex
CREATE INDEX "JurnalTransaksi_periodeId_tanggal_idx" ON "JurnalTransaksi"("periodeId", "tanggal");

-- CreateIndex
CREATE INDEX "JurnalTransaksi_akunDanaBiayaId_idx" ON "JurnalTransaksi"("akunDanaBiayaId");

-- CreateIndex
CREATE INDEX "JurnalTransaksi_akunKasId_idx" ON "JurnalTransaksi"("akunKasId");

-- CreateIndex
CREATE UNIQUE INDEX "JurnalTransaksi_periodeId_nomorBukti_key" ON "JurnalTransaksi"("periodeId", "nomorBukti");

-- CreateIndex
CREATE UNIQUE INDEX "DokumenResmi_periodeId_jenisDokumen_key" ON "DokumenResmi"("periodeId", "jenisDokumen");

-- CreateIndex
CREATE INDEX "DaftarNominatifUpah_periodeId_idx" ON "DaftarNominatifUpah"("periodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DaftarNominatifUpahHarian_daftarNominatifId_tanggal_key" ON "DaftarNominatifUpahHarian"("daftarNominatifId", "tanggal");

-- CreateIndex
CREATE INDEX "Approval_menuHarianId_idx" ON "Approval"("menuHarianId");

-- CreateIndex
CREATE INDEX "Approval_rabHarianId_idx" ON "Approval"("rabHarianId");

-- CreateIndex
CREATE INDEX "ValidasiStok_tanggal_idx" ON "ValidasiStok"("tanggal");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "Notifikasi_userId_dibaca_idx" ON "Notifikasi"("userId", "dibaca");

-- AddForeignKey
ALTER TABLE "SetupLembaga" ADD CONSTRAINT "SetupLembaga_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelompokUmurMenu" ADD CONSTRAINT "KelompokUmurMenu_kategoriPenerimaId_fkey" FOREIGN KEY ("kategoriPenerimaId") REFERENCES "KategoriPenerima"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaat" ADD CONSTRAINT "InputPenerimaManfaat_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaat" ADD CONSTRAINT "InputPenerimaManfaat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaatDetail" ADD CONSTRAINT "InputPenerimaManfaatDetail_inputPenerimaManfaatId_fkey" FOREIGN KEY ("inputPenerimaManfaatId") REFERENCES "InputPenerimaManfaat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaatDetail" ADD CONSTRAINT "InputPenerimaManfaatDetail_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "KategoriPenerima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaatDetail" ADD CONSTRAINT "InputPenerimaManfaatDetail_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputPenerimaManfaatDetail" ADD CONSTRAINT "InputPenerimaManfaatDetail_posyanduId_fkey" FOREIGN KEY ("posyanduId") REFERENCES "Posyandu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SekolahKelasDetail" ADD CONSTRAINT "SekolahKelasDetail_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SekolahKelasDetail" ADD CONSTRAINT "SekolahKelasDetail_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HargaPaketKategoriPeriode" ADD CONSTRAINT "HargaPaketKategoriPeriode_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HargaPaketKategoriPeriode" ADD CONSTRAINT "HargaPaketKategoriPeriode_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "KategoriPenerima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HargaPaketKategoriPeriode" ADD CONSTRAINT "HargaPaketKategoriPeriode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HargaBahanPeriode" ADD CONSTRAINT "HargaBahanPeriode_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HargaBahanPeriode" ADD CONSTRAINT "HargaBahanPeriode_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HargaBahanPeriode" ADD CONSTRAINT "HargaBahanPeriode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoAwalBarang" ADD CONSTRAINT "SaldoAwalBarang_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoAwalBarang" ADD CONSTRAINT "SaldoAwalBarang_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiStok" ADD CONSTRAINT "MutasiStok_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiStok" ADD CONSTRAINT "MutasiStok_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiStok" ADD CONSTRAINT "MutasiStok_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterMenuMingguan" ADD CONSTRAINT "MasterMenuMingguan_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterMenuMingguan" ADD CONSTRAINT "MasterMenuMingguan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuHarian" ADD CONSTRAINT "MenuHarian_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengirimanHarian" ADD CONSTRAINT "PengirimanHarian_menuHarianId_fkey" FOREIGN KEY ("menuHarianId") REFERENCES "MenuHarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengirimanHarian" ADD CONSTRAINT "PengirimanHarian_kendaraanId_fkey" FOREIGN KEY ("kendaraanId") REFERENCES "Kendaraan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuHarianBlok" ADD CONSTRAINT "MenuHarianBlok_menuHarianId_fkey" FOREIGN KEY ("menuHarianId") REFERENCES "MenuHarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuHarianBlok" ADD CONSTRAINT "MenuHarianBlok_kelompokUmurMenuId_fkey" FOREIGN KEY ("kelompokUmurMenuId") REFERENCES "KelompokUmurMenu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuHarianBlok" ADD CONSTRAINT "MenuHarianBlok_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlergiCatatan" ADD CONSTRAINT "AlergiCatatan_blokId_fkey" FOREIGN KEY ("blokId") REFERENCES "MenuHarianBlok"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_blokId_fkey" FOREIGN KEY ("blokId") REFERENCES "MenuHarianBlok"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemBahan" ADD CONSTRAINT "MenuItemBahan_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemBahan" ADD CONSTRAINT "MenuItemBahan_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuTargetGizi" ADD CONSTRAINT "MenuTargetGizi_blokId_fkey" FOREIGN KEY ("blokId") REFERENCES "MenuHarianBlok"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOrganoleptik" ADD CONSTRAINT "MenuOrganoleptik_blokId_fkey" FOREIGN KEY ("blokId") REFERENCES "MenuHarianBlok"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RabHarian" ADD CONSTRAINT "RabHarian_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RabHarian" ADD CONSTRAINT "RabHarian_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPembelian" ADD CONSTRAINT "TransaksiPembelian_rabHarianId_fkey" FOREIGN KEY ("rabHarianId") REFERENCES "RabHarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPembelian" ADD CONSTRAINT "TransaksiPembelian_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPembelianItem" ADD CONSTRAINT "TransaksiPembelianItem_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "TransaksiPembelian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPembelianItem" ADD CONSTRAINT "TransaksiPembelianItem_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnggaranHarian" ADD CONSTRAINT "AnggaranHarian_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnggaranBahanMakananDetail" ADD CONSTRAINT "AnggaranBahanMakananDetail_anggaranHarianId_fkey" FOREIGN KEY ("anggaranHarianId") REFERENCES "AnggaranHarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnggaranBahanMakananDetail" ADD CONSTRAINT "AnggaranBahanMakananDetail_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "KategoriPenerima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoAwalPeriode" ADD CONSTRAINT "SaldoAwalPeriode_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoAwalPeriode" ADD CONSTRAINT "SaldoAwalPeriode_akunId_fkey" FOREIGN KEY ("akunId") REFERENCES "Akun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalTransaksi" ADD CONSTRAINT "JurnalTransaksi_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalTransaksi" ADD CONSTRAINT "JurnalTransaksi_akunDanaBiayaId_fkey" FOREIGN KEY ("akunDanaBiayaId") REFERENCES "Akun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalTransaksi" ADD CONSTRAINT "JurnalTransaksi_akunKasId_fkey" FOREIGN KEY ("akunKasId") REFERENCES "Akun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalTransaksi" ADD CONSTRAINT "JurnalTransaksi_transaksiPembelianId_fkey" FOREIGN KEY ("transaksiPembelianId") REFERENCES "TransaksiPembelian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalTransaksi" ADD CONSTRAINT "JurnalTransaksi_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenResmi" ADD CONSTRAINT "DokumenResmi_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenResmi" ADD CONSTRAINT "DokumenResmi_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaftarNominatifUpah" ADD CONSTRAINT "DaftarNominatifUpah_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaftarNominatifUpahHarian" ADD CONSTRAINT "DaftarNominatifUpahHarian_daftarNominatifId_fkey" FOREIGN KEY ("daftarNominatifId") REFERENCES "DaftarNominatifUpah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_menuHarianId_fkey" FOREIGN KEY ("menuHarianId") REFERENCES "MenuHarian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_rabHarianId_fkey" FOREIGN KEY ("rabHarianId") REFERENCES "RabHarian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidasiStok" ADD CONSTRAINT "ValidasiStok_bahanPokokId_fkey" FOREIGN KEY ("bahanPokokId") REFERENCES "BahanPokok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidasiStok" ADD CONSTRAINT "ValidasiStok_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
