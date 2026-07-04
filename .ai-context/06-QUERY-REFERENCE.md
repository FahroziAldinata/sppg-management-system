# Query Reference — BKU & BP (Buku Kas Umum & Buku Pembantu)

Ditulis pas gap #2 (query laporan) ditutup sebagian. Pola ini juga jadi basis buat LR/laporan lain yg sejenis (semua "buku" = jurnal + saldo berjalan).

## Cara baca `JurnalTransaksi`

Beda dari Excel asli (yang punya kolom Debet & Kredit terpisah), schema pakai 1 baris = 1 transaksi dengan 2 kaki (`akunKas` + `akunDanaBiaya`) + `nominal` + `jenis` (`MASUK`/`KELUAR`, dari perspektif **akunKas**):

- `jenis = MASUK` → uang masuk ke `akunKas` (debet di BKU), keluar dari `akunDanaBiaya` (kredit di BP dana/biaya).
- `jenis = KELUAR` → uang keluar dari `akunKas` (kredit di BKU), masuk ke `akunDanaBiaya` (debet di BP dana/biaya).

Jadi arah Debet/Kredit **relatif terhadap akun mana yang lagi direport** — BKU selalu dari sudut pandang akun KAS, BP dana/biaya dari sudut pandang akun DANA/BIAYA-nya.

## BKU (Buku Kas Umum)

Saldo awal = `SaldoAwalPeriode` untuk akun bertipe `KAS` (kalau ada >1 akun kas, jumlahkan; kalau BKU harus per-akun-kas, filter `akunId` juga).

```ts
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function generateBKU(periodeId: string) {
  const saldoAwalAgg = await prisma.saldoAwalPeriode.aggregate({
    where: { periodeId, akun: { tipe: "KAS" } },
    _sum: { saldoAwal: true },
  });
  let saldo = saldoAwalAgg._sum.saldoAwal ?? new Prisma.Decimal(0);

  const jurnal = await prisma.jurnalTransaksi.findMany({
    where: { periodeId },
    orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
    include: { akunKas: true, akunDanaBiaya: true },
  });

  return jurnal.map((row) => {
    const debet = row.jenis === "MASUK" ? row.nominal : new Prisma.Decimal(0);
    const kredit = row.jenis === "KELUAR" ? row.nominal : new Prisma.Decimal(0);
    saldo = saldo.plus(debet).minus(kredit);
    return {
      bulan: row.tanggal.getMonth() + 1,
      tanggal: row.tanggal,
      noBukti: row.nomorBukti,
      uraian: row.uraian,
      debet,
      kredit,
      saldoBerjalan: saldo,
    };
  });
}
```

## BP (Buku Pembantu) — per akun (Kas/Bank, Dana Bahan Baku, Biaya Operasional, dst)

Sama persis polanya, tinggal filter ke 1 `akunId` spesifik (bisa jadi akunKas ATAU akunDanaBiaya tergantung buku pembantu apa yang diminta) dan balik arah debet/kredit kalau yang direport adalah sisi `akunDanaBiaya`.

```ts
async function generateBP(periodeId: string, akunId: string) {
  const akun = await prisma.akun.findUniqueOrThrow({ where: { id: akunId } });

  const saldoAwal = await prisma.saldoAwalPeriode.findUnique({
    where: { periodeId_akunId: { periodeId, akunId } },
  });
  let saldo = saldoAwal?.saldoAwal ?? new Prisma.Decimal(0);

  const jurnal = await prisma.jurnalTransaksi.findMany({
    where: {
      periodeId,
      OR: [{ akunKasId: akunId }, { akunDanaBiayaId: akunId }],
    },
    orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
  });

  return jurnal.map((row) => {
    // kalau akun yg direport adalah sisi KAS, arah sama seperti BKU.
    // kalau sisi DANA/BIAYA, arahnya kebalik.
    const isKasSide = row.akunKasId === akunId;
    const masukKeAkunIni = isKasSide ? row.jenis === "MASUK" : row.jenis === "KELUAR";
    const debet = masukKeAkunIni ? row.nominal : new Prisma.Decimal(0);
    const kredit = masukKeAkunIni ? new Prisma.Decimal(0) : row.nominal;
    saldo = saldo.plus(debet).minus(kredit);
    return {
      tanggal: row.tanggal,
      noBukti: row.nomorBukti,
      uraian: row.uraian,
      debet,
      kredit,
      saldoBerjalan: saldo,
    };
  });
}
```

## Realisasi per KategoriDana — basis LPA/SPTJ

`AnggaranHarian.aktual` itu **kolom tersimpan** (bukan view/computed field), yang HARUS di-maintain lewat fungsi terpisah tiap kali ada `JurnalTransaksi` baru (lihat `recalcAktualAnggaran` di bawah). Karena sudah tersimpan, laporan tinggal `SUM` dari `AnggaranHarian` langsung — jauh lebih murah daripada scan ulang `JurnalTransaksi` tiap generate laporan.

```ts
async function getRealisasiPeriode(
  periodeId: string,
  kategoriDana: "BAHAN_MAKANAN" | "OPERASIONAL" | "INSENTIF_FASILITAS",
) {
  const agg = await prisma.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana },
    _sum: { rab: true, aktual: true },
  });
  const diajukan = agg._sum.rab ?? new Prisma.Decimal(0);
  const terealisasi = agg._sum.aktual ?? new Prisma.Decimal(0);
  return { diajukan, terealisasi, sisa: diajukan.minus(terealisasi) };
}
```

### Menjaga `aktual` tetap sinkron — panggil tiap kali `JurnalTransaksi` dibuat/diedit/dihapus untuk hari itu

```ts
async function recalcAktualAnggaran(periodeId: string, tanggal: Date, kategoriDana: "BAHAN_MAKANAN" | "OPERASIONAL" | "INSENTIF_FASILITAS") {
  const agg = await prisma.jurnalTransaksi.aggregate({
    where: {
      periodeId,
      tanggal,
      akunDanaBiaya: { tipe: "BIAYA", kategoriDana },
    },
    _sum: { nominal: true },
  });
  const aktual = agg._sum.nominal ?? new Prisma.Decimal(0);

  const row = await prisma.anggaranHarian.findUnique({
    where: { periodeId_tanggal_kategoriDana: { periodeId, tanggal, kategoriDana } },
  });
  if (!row) return; // belum ada RAB harian utk kombinasi ini — tidak ada yg direcalc

  await prisma.anggaranHarian.update({
    where: { id: row.id },
    data: { aktual, selisih: row.rab.minus(aktual) },
  });
}
```

## LPA (Laporan Penggunaan Anggaran) — full generation

```ts
const LABEL_KATEGORI: Record<string, string> = {
  BAHAN_MAKANAN: "Bahan Baku",
  OPERASIONAL: "Operasional",
  INSENTIF_FASILITAS: "Sewa", // label resmi di tabel LPA, sama arti dgn "Insentif Fasilitas"
};

async function generateLPA(periodeId: string, nomorDokumen: string) {
  const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });
  const lembaga = await prisma.setupLembaga.findUniqueOrThrow({ where: { periodeId } });

  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"] as const;
  const rincian = await Promise.all(
    kategoris.map(async (k) => ({
      label: LABEL_KATEGORI[k],
      ...(await getRealisasiPeriode(periodeId, k)),
    })),
  );

  const total = rincian.reduce(
    (acc, r) => ({
      diajukan: acc.diajukan.plus(r.diajukan),
      terealisasi: acc.terealisasi.plus(r.terealisasi),
      sisa: acc.sisa.plus(r.sisa),
    }),
    { diajukan: new Prisma.Decimal(0), terealisasi: new Prisma.Decimal(0), sisa: new Prisma.Decimal(0) },
  );

  return {
    nomorDokumen, // "01/LPA/2025" — manual, lihat DokumenResmi.nomorDokumen
    periodeLabel: `${periode.tanggalMulai.toLocaleDateString("id-ID")} - ${periode.tanggalSelesai.toLocaleDateString("id-ID")}`,
    namaPejabat: lembaga.namaKepalaSPPG,
    jabatan: "Kepala Satuan Pelayanan Pemenuhan Gizi/Ketua Yayasan",
    namaLembaga: lembaga.namaLembaga,
    rincian, // [{ label: "Bahan Baku", diajukan, terealisasi, sisa }, ...]
    total,
    nomorRekeningVA: lembaga.nomorRekeningVA,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan,
    namaYayasan: lembaga.namaYayasan,
    ketuaYayasan: lembaga.ketuaYayasan,
    namaAkuntan: lembaga.namaAkuntanSPPG,
  };
}
```

## SPTJ (Surat Pernyataan Tanggung Jawab) — full generation

Cuma butuh 3 angka total (Penerimaan/Pengeluaran/Sisa), bukan rincian per kategori:

```ts
async function generateSPTJ(periodeId: string) {
  const lembaga = await prisma.setupLembaga.findUniqueOrThrow({ where: { periodeId } });
  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"] as const;
  const semua = await Promise.all(kategoris.map((k) => getRealisasiPeriode(periodeId, k)));

  const jumlahPenerimaan = semua.reduce((s, r) => s.plus(r.diajukan), new Prisma.Decimal(0));
  const jumlahPengeluaran = semua.reduce((s, r) => s.plus(r.terealisasi), new Prisma.Decimal(0));

  return {
    namaPejabat: lembaga.namaKepalaSPPG,
    jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
    jumlahPenerimaan,
    jumlahPengeluaran,
    sisaDana: jumlahPenerimaan.minus(jumlahPengeluaran),
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan,
  };
}
```

## BAPSD (Berita Acara Pengalihan Sisa Dana) — full generation

```ts
async function generateBAPSD(periodeId: string, nomorDokumen: string) {
  const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });
  const lembaga = await prisma.setupLembaga.findUniqueOrThrow({ where: { periodeId } });
  const sptj = await generateSPTJ(periodeId); // sisaDana dipakai lagi di sini

  return {
    nomorDokumen, // "01/BAPSD/IX/2025"
    periodeLabel: `${periode.tanggalMulai.toLocaleDateString("id-ID")} - ${periode.tanggalSelesai.toLocaleDateString("id-ID")}`,
    sisaDana: sptj.sisaDana,
    tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya,
    namaYayasan: lembaga.namaYayasan,
    ketuaYayasan: lembaga.ketuaYayasan,
    namaAkuntan: lembaga.namaAkuntanSPPG,
    namaPejabat: lembaga.namaKepalaSPPG,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan,
  };
}
```

Output ke-3 fungsi di atas tinggal disuntik ke template surat (docx/PDF) — semua data mentahnya sudah lengkap, tidak perlu query tambahan.

## Belum tercakup di sini (kerjaan lanjutan, di luar scope query laporan)

- Pemanggilan `recalcAktualAnggaran` harus di-trigger otomatis tiap `JurnalTransaksi` dibuat/diedit/dihapus (taruh di service layer API, bukan di query laporan).
- Template docx/PDF aktual untuk LPA/SPTJ/BAPSD (styling, tanda tangan, dst) — fungsi di atas cuma nyiapin data mentahnya.
- Format tampilan Rupiah (`Intl.NumberFormat("id-ID")`), pembulatan, dan penomoran bulan Indonesia untuk BKU.
- Pagination/lazy load kalau jurnal transaksi ribuan baris per periode (query `generateBKU`/`generateBP` di atas masih `findMany` tanpa limit).
