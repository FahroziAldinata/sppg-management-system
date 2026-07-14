const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Memulai pembersihan database...");
  
  // Daftar semua tabel kecuali User dan _prisma_migrations
  const tables = [
    "SetupLembaga",
    "InputPenerimaManfaatDetail",
    "InputPenerimaManfaat",
    "SekolahKelasDetail",
    "HargaPaketKategoriPeriode",
    "HargaBahanPeriode",
    "SaldoAwalBarang",
    "MutasiStok",
    "MasterMenuMingguan",
    "PengirimanHarian",
    "MenuItemBahan",
    "MenuItem",
    "MenuTargetGizi",
    "MenuOrganoleptik",
    "AlergiCatatan",
    "MenuHarianBlok",
    "MenuHarian",
    "TransaksiPembelianItem",
    "TransaksiPembelian",
    "RabHarian",
    "AnggaranBahanMakananDetail",
    "AnggaranHarian",
    "SaldoAwalPeriode",
    "JurnalTransaksi",
    "DokumenResmi",
    "DaftarNominatifUpahHarian",
    "DaftarNominatifUpah",
    "Approval",
    "ValidasiStok",
    "AuditLog",
    "Notifikasi",
    "Sekolah",
    "Posyandu",
    "Supplier",
    "BahanPokok",
    "Kendaraan",
    "BatasHargaPorsi",
    "KategoriPenerima",
    "KelompokUmurMenu",
    "Akun",
    "Periode"
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`Berhasil mengosongkan tabel: ${table}`);
    } catch (error) {
      console.error(`Gagal mengosongkan tabel ${table}:`, error.message);
    }
  }

  console.log("Pembersihan database selesai! Hanya menyisakan tabel 'User'.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
