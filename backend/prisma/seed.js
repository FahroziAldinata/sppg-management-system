const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // ---------------------------------------------------------------------
  // 1. KATEGORI PENERIMA — 13 kategori resmi BGN
  // jenisPorsi & mapping dikonfirmasi BGN+akuntan di 03-DECISIONS.md v5.4
  // ---------------------------------------------------------------------
  const kategoriData = [
    { kode: "PAUD_TK", nama: "PAUD/TK/RA/TKLB", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 1 },
    { kode: "SD_1_3", nama: "SD/MI/SDLB Kelas 1-3", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 2 },
    { kode: "SD_4_6", nama: "SD/MI/SDLB Kelas 4-6", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 3 },
    { kode: "SMP_1_3", nama: "SMP/MTs/SMPLB/Pesantren", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 4 },
    { kode: "SMA_SMK_4_6", nama: "SMA/MA/SMK/SMALB/Pesantren", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 5 },
    { kode: "ATS_KURANG_9TH", nama: "Anak Tidak Sekolah <9 th", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 6 },
    { kode: "ATS_9_18TH", nama: "Anak Tidak Sekolah 9-18 th", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 7 },
    { kode: "PENDIDIK", nama: "Pendidik", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 8 },
    { kode: "TENAGA_KEPENDIDIKAN", nama: "Tenaga Kependidikan", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 9 },
    { kode: "BUMIL", nama: "Ibu Hamil", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 10 },
    { kode: "BUSUI", nama: "Ibu Menyusui", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 11 },
    { kode: "BALITA", nama: "Balita (Non PAUD)", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 12 },
    { kode: "KADER_POSYANDU", nama: "Kader Posyandu", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 13 },
  ];

  const kategoriMap = {};
  for (const k of kategoriData) {
    const row = await prisma.kategoriPenerima.upsert({
      where: { kode: k.kode },
      update: {},
      create: k,
    });
    kategoriMap[k.kode] = row.id;
  }

  // ---------------------------------------------------------------------
  // 2. KELOMPOK UMUR MENU — many-to-many ke KategoriPenerima (v5.3)
  // SD dibedakan per level; SMP+SMA gabung 1 menu; Pendidik+TenagaKependidikan
  // gabung 1 menu ("PIC_SEKOLAH")
  // ---------------------------------------------------------------------
  const kelompokUmurData = [
    { kode: "TK_PAUD", jalur: "SISWA", nama: "TK/PAUD (4-6 th)", rentangUsia: "4-6 th", kategori: ["PAUD_TK"] },
    { kode: "SD_1_3", jalur: "SISWA", nama: "SD Kelas 1-3 (7-9 th)", rentangUsia: "7-9 th", kategori: ["SD_1_3"] },
    { kode: "SD_4_6", jalur: "SISWA", nama: "SD Kelas 4-6 (10-12 th)", rentangUsia: "10-12 th", kategori: ["SD_4_6"] },
    { kode: "SMP_SMA", jalur: "SISWA", nama: "SMP & SMA/SMK (13-18 th)", rentangUsia: "13-18 th", kategori: ["SMP_1_3", "SMA_SMK_4_6"] },
    { kode: "PIC_SEKOLAH", jalur: "SISWA", nama: "PIC Sekolah (Pendidik & Tenaga Kependidikan)", rentangUsia: null, kategori: ["PENDIDIK", "TENAGA_KEPENDIDIKAN"] },
    { kode: "BALITA_6_11BLN", jalur: "TIGA_B", nama: "Balita (6-11 bulan)", rentangUsia: "6-11 bln", kategori: ["BALITA"] },
    { kode: "BALITA_1_3TH", jalur: "TIGA_B", nama: "Balita (1-3 tahun)", rentangUsia: "1-3 th", kategori: ["BALITA"] },
    { kode: "BUMIL", jalur: "TIGA_B", nama: "Ibu Hamil", rentangUsia: null, kategori: ["BUMIL"] },
    { kode: "BUSUI", jalur: "TIGA_B", nama: "Ibu Menyusui", rentangUsia: null, kategori: ["BUSUI"] },
  ];

  for (const ku of kelompokUmurData) {
    await prisma.kelompokUmurMenu.upsert({
      where: { kode: ku.kode },
      update: {},
      create: {
        kode: ku.kode,
        jalur: ku.jalur,
        nama: ku.nama,
        rentangUsia: ku.rentangUsia,
        kategoriPenerima: { connect: ku.kategori.map((k) => ({ id: kategoriMap[k] })) },
      },
    });
  }

  // ---------------------------------------------------------------------
  // 3. BATAS HARGA PORSI
  // ---------------------------------------------------------------------
  await prisma.batasHargaPorsi.upsert({
    where: { jenisPorsi: "KECIL" },
    update: {},
    create: { jenisPorsi: "KECIL", batasMaksimal: 8000 },
  });
  await prisma.batasHargaPorsi.upsert({
    where: { jenisPorsi: "BESAR" },
    update: {},
    create: { jenisPorsi: "BESAR", batasMaksimal: 10000 },
  });

  // ---------------------------------------------------------------------
  // 4. CHART OF ACCOUNTS — final per 03-DECISIONS.md v5.5
  // Header (1000/1100/2000) SENGAJA TIDAK di-seed — bukan akun transaksi,
  // cuma judul section di Excel asli.
  // ---------------------------------------------------------------------
  const akunData = [
    { kode: "1101", nama: "Petty Cash/Cash in Hand", tipe: "KAS", kategoriDana: null },
    { kode: "1102", nama: "Kas di Bank", tipe: "KAS", kategoriDana: null },
    { kode: "2110", nama: "Dana Bahan Baku", tipe: "DANA", kategoriDana: "BAHAN_MAKANAN" },
    { kode: "2120", nama: "Operasional", tipe: "BIAYA", kategoriDana: "OPERASIONAL" }, // 1 akun gabungan, lihat catatan v5.5
    { kode: "2130", nama: "Dana Insentif Fasilitas", tipe: "DANA", kategoriDana: "INSENTIF_FASILITAS" },
    { kode: "2140", nama: "Pungutan/Setoran PPN", tipe: "PAJAK", kategoriDana: null },
    { kode: "2150", nama: "Pungutan/Setoran PPh 21", tipe: "PAJAK", kategoriDana: null },
    { kode: "2160", nama: "Pungutan/Setoran PPh 22", tipe: "PAJAK", kategoriDana: null },
    { kode: "2170", nama: "Pungutan/Setoran PPh 23", tipe: "PAJAK", kategoriDana: null },
    { kode: "2180", nama: "Pungutan/Setoran PPh pasal 4 ayat (2)", tipe: "PAJAK", kategoriDana: null },
    { kode: "2190", nama: "Biaya Bahan Baku", tipe: "BIAYA", kategoriDana: "BAHAN_MAKANAN" },
    { kode: "2121", nama: "Biaya Insentif Fasilitas", tipe: "BIAYA", kategoriDana: "INSENTIF_FASILITAS" },
  ];

  for (const a of akunData) {
    await prisma.akun.upsert({
      where: { kode: a.kode },
      update: {},
      create: a,
    });
  }

  // ---------------------------------------------------------------------
  // 5. KENDARAAN — 3 mobil (ganti nama/plat sesuai data asli SPPG)
  // ---------------------------------------------------------------------
  const kendaraanNama = ["Mobil 1", "Mobil 2", "Mobil 3"];
  for (const nama of kendaraanNama) {
    const existing = await prisma.kendaraan.findFirst({ where: { namaKendaraan: nama } });
    if (!existing) {
      await prisma.kendaraan.create({ data: { namaKendaraan: nama } });
    }
  }

  // ---------------------------------------------------------------------
  // 6. USER — 1 akun per role. GANTI PASSWORD INI SEBELUM DIPAKAI DI PROD.
  // ---------------------------------------------------------------------
  const userData = [
    { username: "aslap", nama: "Aslap Contoh", role: "ASLAP" },
    { username: "mitra", nama: "Mitra Contoh", role: "MITRA" },
    { username: "ahligizi", nama: "Ahli Gizi Contoh", role: "AHLI_GIZI" },
    { username: "akuntan", nama: "Windi Amelia Winengsih, S.Ak", role: "AKUNTAN" },
    { username: "kepalasppg", nama: "Yayang Badruddin, S.E", role: "KEPALA_SPPG" },
  ];

  const defaultPasswordHash = await bcrypt.hash("ganti-password-ini", 10);
  for (const u of userData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, passwordHash: defaultPasswordHash },
    });
  }

  // ---------------------------------------------------------------------
  // 7. SEKOLAH & POSYANDU — contoh dari data yang sudah dibahas
  // ---------------------------------------------------------------------
  const sekolahNama = ["TK Amanah", "SDN Wanajaya", "SMK Pelita"];
  for (const nama of sekolahNama) {
    const existing = await prisma.sekolah.findFirst({ where: { nama } });
    if (!existing) {
      await prisma.sekolah.create({ data: { nama } });
    }
  }

  const posyanduNama = ["Posyandu Melati", "Posyandu Mawar", "Posyandu Dahlia"];
  for (const nama of posyanduNama) {
    const existing = await prisma.posyandu.findFirst({ where: { nama } });
    if (!existing) {
      await prisma.posyandu.create({ data: { nama } });
    }
  }

  // ---------------------------------------------------------------------
  // 8. PERIODE CONTOH + SETUP LEMBAGA — persis data dari surat LPA/SPTJ/BAPSD
  // yang sudah diberikan (8-17 Januari 2026)
  // ---------------------------------------------------------------------
  const periode = await prisma.periode.upsert({
    where: { id: "periode-contoh-8-17-jan-2026" },
    update: {},
    create: {
      id: "periode-contoh-8-17-jan-2026",
      tanggalMulai: new Date("2026-01-08"),
      tanggalSelesai: new Date("2026-01-17"),
      status: "DRAFT",
      anggaranAlokasi: 500_000_000,
      totalDanaDiterima: 500_000_000,
    },
  });

  await prisma.setupLembaga.upsert({
    where: { periodeId: periode.id },
    update: {},
    create: {
      periodeId: periode.id,
      namaLembaga: "SPPG Palabuan Ujungjaya",
      alamat:
        "Jl. Rd. Ali Sadikin KM.02 Dsn. Tegalwangon No.38, RT.2/RW.2, Palabuan, Kec. Ujung Jaya, Kabupaten Sumedang, Jawa Barat 45383",
      namaKepalaSPPG: "Yayang Badruddin, S.E",
      namaAkuntanSPPG: "Windi Amelia Winengsih, S.Ak",
      namaYayasan: "Yayasan Tiga Srikandi Berlian Sumedang",
      ketuaYayasan: "Dizhar Priatama",
      nomorRekeningVA: "294341000020998",
      tahunAnggaran: 2026,
      awalPeriodeBerikutnya: new Date("2026-01-19"),
      tanggalPelaporan: new Date("2026-01-17"),
      tempatPelaporan: "Sumedang",
    },
  });

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
