const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium").default || require("@sparticuz/chromium");
const { renderLpaHtml } = require("../templates/dokumen/lpa");
const { renderSptjHtml } = require("../templates/dokumen/sptj");
const { renderBapsdHtml } = require("../templates/dokumen/bapsd");
const { renderBkuHtml } = require("../templates/dokumen/bku");
const { getTotalPorsiBlok } = require("../lib/porsiHelper");

const router = express.Router();

// Jabatan Kepala SPPG — satu sumber kebenaran, dipakai di /lpa dan /lpa/pdf
const JABATAN_KEPALA_SPPG = "Kepala Satuan Pelayanan Pemenuhan Gizi/Ketua Yayasan";

// KONTRAK: Field tanggal dari client WAJIB dikirim sebagai date-only string "YYYY-MM-DD"
function normalizeDateUTC(input) {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function getRealisasiPeriode(periodeId, kategoriDana) {
  const agg = await prisma.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana },
    _sum: { rab: true, aktual: true },
  });
  return {
    diajukan: Number(agg._sum.rab || 0),
    terealisasi: Number(agg._sum.aktual || 0),
    sisa: Number(agg._sum.rab || 0) - Number(agg._sum.aktual || 0)
  };
}

const HARI_MAP = {
  1: "SENIN",
  2: "SELASA",
  3: "RABU",
  4: "KAMIS",
  5: "JUMAT",
  6: "SABTU"
};

async function getBkuData(periodeId) {
  const [lembaga, periode, saldoAwalAgg, danaMasukAggResult, realisasiBahan, realisasiOperasional, realisasiSewa] = await Promise.all([
    prisma.setupLembaga.findFirst({ where: { periodeId } }),
    prisma.periode.findUnique({ where: { id: periodeId } }),
    prisma.saldoAwalPeriode.aggregate({
      where: { periodeId, akun: { tipe: "KAS" } },
      _sum: { saldoAwal: true },
    }),
    // SUM live dana masuk (BanPer) — filter jenis MASUK ke akun DANA, exclude BIAYA/KAS/PAJAK
    prisma.jurnalTransaksi.aggregate({
      where: { periodeId, jenis: "MASUK", akunDanaBiaya: { tipe: "DANA" } },
      _sum: { nominal: true },
    }),
    getRealisasiPeriode(periodeId, "BAHAN_MAKANAN"),
    getRealisasiPeriode(periodeId, "OPERASIONAL"),
    getRealisasiPeriode(periodeId, "INSENTIF_FASILITAS")
  ]);

  if (!lembaga || !periode) {
    return null;
  }

  const sisaDanaLalu = Number(saldoAwalAgg._sum.saldoAwal || 0);
  const danaDiterimaSaatIni = Number(danaMasukAggResult._sum.nominal || 0);
  let saldo = sisaDanaLalu;

  const jurnal = await prisma.jurnalTransaksi.findMany({
    where: { periodeId },
    orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
    include: { akunKas: true, akunDanaBiaya: true },
  });

  const transaksi = jurnal.map((row) => {
    const debet = row.jenis === "MASUK" ? Number(row.nominal) : 0;
    const kredit = row.jenis === "KELUAR" ? Number(row.nominal) : 0;
    saldo = saldo + debet - kredit;
    return {
      id: row.id,
      bulan: row.tanggal.getUTCMonth() + 1,
      tanggal: row.tanggal.toISOString().split("T")[0],
      noBukti: row.nomorBukti,
      uraian: row.uraian,
      debet,
      kredit,
      saldoBerjalan: saldo,
      jumlah: kredit
    };
  });

  return {
    ringkasan: {
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      sisaDanaLalu,
      danaDiterimaSaatIni,
      danaTersedia: sisaDanaLalu + danaDiterimaSaatIni,
      biayaBahanBaku: Number(realisasiBahan.terealisasi),
      biayaOperasional: Number(realisasiOperasional.terealisasi),
      biayaInsentifFasilitas: Number(realisasiSewa.terealisasi),
      totalPengeluaran: Number(realisasiBahan.terealisasi) + Number(realisasiOperasional.terealisasi) + Number(realisasiSewa.terealisasi),
      sisaDanaSaatIni: (sisaDanaLalu + danaDiterimaSaatIni) - (Number(realisasiBahan.terealisasi) + Number(realisasiOperasional.terealisasi) + Number(realisasiSewa.terealisasi)),
    },
    transaksi
  };
}

// GET /api/laporan/bku - Buku Kas Umum
router.get("/bku", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BKU" });
  }
});

// GET /api/laporan/bku/pdf - Render BKU sebagai PDF
router.get("/bku/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan" });
    }

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    const html = renderBkuHtml(data);

    let executablePath;
    let launchArgs = [];
    if (process.platform === 'win32') {
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      executablePath = await chromium.executablePath();
      launchArgs = chromium.args;
    }

    browser = await puppeteer.launch({
      args: launchArgs.length ? launchArgs : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport || null,
      executablePath,
      headless: chromium.headless || true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BKU-${data.ringkasan.periodeLabel.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[bku/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BKU" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/bp - Buku Pembantu per Akun
router.get("/bp", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, akunId } = req.query;
    if (!periodeId || !akunId) {
      return res.status(400).json({ error: "periodeId dan akunId wajib disertakan pada query parameter" });
    }

    const akun = await prisma.akun.findUnique({ where: { id: akunId } });
    if (!akun) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }

    const saldoAwal = await prisma.saldoAwalPeriode.findUnique({
      where: { periodeId_akunId: { periodeId, akunId } },
    });
    let saldo = Number(saldoAwal?.saldoAwal || 0);

    const jurnal = await prisma.jurnalTransaksi.findMany({
      where: {
        periodeId,
        OR: [{ akunKasId: akunId }, { akunDanaBiayaId: akunId }],
      },
      orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
    });

    const data = jurnal.map((row) => {
      const isKasSide = row.akunKasId === akunId;
      const masukKeAkunIni = isKasSide ? row.jenis === "MASUK" : row.jenis === "KELUAR";
      const debet = masukKeAkunIni ? Number(row.nominal) : 0;
      const kredit = masukKeAkunIni ? 0 : Number(row.nominal);
      saldo = saldo + debet - kredit;
      return {
        id: row.id,
        tanggal: row.tanggal.toISOString().split("T")[0],
        noBukti: row.nomorBukti,
        uraian: row.uraian,
        debet,
        kredit,
        saldoBerjalan: saldo,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat Buku Pembantu" });
  }
});

// GET /api/laporan/lpa - Laporan Penggunaan Anggaran
router.get("/lpa", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, nomorDokumen, isLr } = req.query;
    const isLrBool = isLr === 'true';
    if (!periodeId || (!isLrBool && !nomorDokumen)) {
      return res.status(400).json({ error: isLrBool ? "periodeId wajib disertakan pada query parameter" : "periodeId dan nomorDokumen wajib disertakan pada query parameter" });
    }

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincian = await Promise.all([
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: "BAHAN_MAKANAN" },
        _sum: { rab: true, aktual: true },
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: "OPERASIONAL" },
        _sum: { rab: true, aktual: true },
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" },
        _sum: { rab: true, aktual: true },
      })
    ]);

    const mappedRincian = [
      {
        label: "Bahan Baku",
        kategoriDana: "BAHAN_MAKANAN",
        diajukan: Number(rincian[0]._sum.rab || 0),
        terealisasi: Number(rincian[0]._sum.aktual || 0),
        sisa: Number(rincian[0]._sum.rab || 0) - Number(rincian[0]._sum.aktual || 0)
      },
      {
        label: "Operasional",
        kategoriDana: "OPERASIONAL",
        diajukan: Number(rincian[1]._sum.rab || 0),
        terealisasi: Number(rincian[1]._sum.aktual || 0),
        sisa: Number(rincian[1]._sum.rab || 0) - Number(rincian[1]._sum.aktual || 0)
      },
      {
        label: "Sewa",
        kategoriDana: "INSENTIF_FASILITAS",
        diajukan: Number(rincian[2]._sum.rab || 0),
        terealisasi: Number(rincian[2]._sum.aktual || 0),
        sisa: Number(rincian[2]._sum.rab || 0) - Number(rincian[2]._sum.aktual || 0)
      }
    ];

    const total = mappedRincian.reduce(
      (acc, r) => ({
        diajukan: acc.diajukan + r.diajukan,
        terealisasi: acc.terealisasi + r.terealisasi,
        sisa: acc.sisa + r.sisa,
      }),
      { diajukan: 0, terealisasi: 0, sisa: 0 }
    );

    res.json({
      success: true,
      data: {
        isLr: isLrBool,
        nomorDokumen: isLrBool ? null : nomorDokumen,
        periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
        namaPejabat: lembaga.namaKepalaSPPG,
        jabatan: JABATAN_KEPALA_SPPG,
        namaLembaga: lembaga.namaLembaga,
        rincian: mappedRincian,
        total,
        nomorRekeningVA: lembaga.nomorRekeningVA,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        namaYayasan: lembaga.namaYayasan,
        ketuaYayasan: lembaga.ketuaYayasan,
        namaAkuntan: lembaga.namaAkuntanSPPG,
        alamat: lembaga.alamat,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat LPA" });
  }
});

// GET /api/laporan/lpa/pdf - Render LPA sebagai PDF (inline, buka di tab baru)
router.get("/lpa/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  let browser;
  try {
    const { periodeId, nomorDokumen, isLr } = req.query;
    const isLrBool = isLr === 'true';
    if (!periodeId || (!isLrBool && !nomorDokumen)) {
      return res.status(400).json({ error: isLrBool ? "periodeId wajib disertakan" : "periodeId dan nomorDokumen wajib disertakan" });
    }

    // === Ambil data (logika identik dengan GET /lpa) ===
    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincianAgg = await Promise.all([
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "BAHAN_MAKANAN" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "OPERASIONAL" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" }, _sum: { rab: true, aktual: true } }),
    ]);

    const rincian = [
      { label: "Bahan Baku", diajukan: Number(rincianAgg[0]._sum.rab || 0), terealisasi: Number(rincianAgg[0]._sum.aktual || 0), sisa: Number(rincianAgg[0]._sum.rab || 0) - Number(rincianAgg[0]._sum.aktual || 0) },
      { label: "Operasional", diajukan: Number(rincianAgg[1]._sum.rab || 0), terealisasi: Number(rincianAgg[1]._sum.aktual || 0), sisa: Number(rincianAgg[1]._sum.rab || 0) - Number(rincianAgg[1]._sum.aktual || 0) },
      { label: "Sewa", diajukan: Number(rincianAgg[2]._sum.rab || 0), terealisasi: Number(rincianAgg[2]._sum.aktual || 0), sisa: Number(rincianAgg[2]._sum.rab || 0) - Number(rincianAgg[2]._sum.aktual || 0) },
    ];

    const total = rincian.reduce(
      (acc, r) => ({ diajukan: acc.diajukan + r.diajukan, terealisasi: acc.terealisasi + r.terealisasi, sisa: acc.sisa + r.sisa }),
      { diajukan: 0, terealisasi: 0, sisa: 0 }
    );

    const data = {
      isLr: isLrBool,
      nomorDokumen: isLrBool ? null : nomorDokumen,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      namaPejabat: lembaga.namaKepalaSPPG,
      jabatan: JABATAN_KEPALA_SPPG,
      namaLembaga: lembaga.namaLembaga,
      rincian,
      total,
      nomorRekeningVA: lembaga.nomorRekeningVA,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      namaYayasan: lembaga.namaYayasan,
      ketuaYayasan: lembaga.ketuaYayasan,
      namaAkuntan: lembaga.namaAkuntanSPPG,
      alamat: lembaga.alamat,
    };

    // === Render HTML → PDF via puppeteer-core + @sparticuz/chromium ===
    const html = renderLpaHtml(data);

    // Setup Chromium serverless-safe (Render/Lambda/Vercel compatible) with local Windows fallback
    let executablePath;
    let launchArgs = [];
    if (process.platform === 'win32') {
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      executablePath = await chromium.executablePath();
      launchArgs = chromium.args;
    }

    browser = await puppeteer.launch({
      args: launchArgs.length ? launchArgs : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport || null,
      executablePath,
      headless: chromium.headless || true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${isLrBool ? 'LR-Resume' : `LPA-${nomorDokumen.replace(/\//g, '-')}`}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[lpa/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF LPA" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/sptj - Surat Pernyataan Tanggung Jawab
router.get("/sptj", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });

    const jumlahPenerimaan = Number(agg._sum.rab || 0);
    const jumlahPengeluaran = Number(agg._sum.aktual || 0);

    res.json({
      success: true,
      data: {
        namaPejabat: lembaga.namaKepalaSPPG,
        jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
        jumlahPenerimaan,
        jumlahPengeluaran,
        sisaDana: jumlahPenerimaan - jumlahPengeluaran,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        tahunAnggaran: lembaga.tahunAnggaran,
        namaLembaga: lembaga.namaLembaga,
        alamat: lembaga.alamat,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat SPTJ" });
  }
});

// GET /api/laporan/sptj/pdf - Render SPTJ sebagai PDF
router.get("/sptj/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan" });
    }

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });

    const jumlahPenerimaan = Number(agg._sum.rab || 0);
    const jumlahPengeluaran = Number(agg._sum.aktual || 0);

    const data = {
      namaPejabat: lembaga.namaKepalaSPPG,
      jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
      jumlahPenerimaan,
      jumlahPengeluaran,
      sisaDana: jumlahPenerimaan - jumlahPengeluaran,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      tahunAnggaran: lembaga.tahunAnggaran,
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
    };

    const html = renderSptjHtml(data);

    let executablePath;
    let launchArgs = [];
    if (process.platform === 'win32') {
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      executablePath = await chromium.executablePath();
      launchArgs = chromium.args;
    }

    browser = await puppeteer.launch({
      args: launchArgs.length ? launchArgs : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport || null,
      executablePath,
      headless: chromium.headless || true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="SPTJ-${periodeId}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[sptj/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF SPTJ" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/bapsd - Berita Acara Pengalihan Sisa Dana
router.get("/bapsd", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, nomorDokumen } = req.query;
    if (!periodeId || !nomorDokumen) {
      return res.status(400).json({ error: "periodeId dan nomorDokumen wajib disertakan pada query parameter" });
    }

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });
    const sisaDana = Number(agg._sum.rab || 0) - Number(agg._sum.aktual || 0);

    res.json({
      success: true,
      data: {
        nomorDokumen,
        periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
        sisaDana,
        tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? lembaga.awalPeriodeBerikutnya.toISOString().split("T")[0] : null,
        namaYayasan: lembaga.namaYayasan,
        ketuaYayasan: lembaga.ketuaYayasan,
        namaAkuntan: lembaga.namaAkuntanSPPG,
        namaPejabat: lembaga.namaKepalaSPPG,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        namaLembaga: lembaga.namaLembaga,
        alamat: lembaga.alamat,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BAPSD" });
  }
});

// GET /api/laporan/bapsd/pdf - Render BAPSD sebagai PDF
router.get("/bapsd/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  let browser;
  try {
    const { periodeId, nomorDokumen } = req.query;
    if (!periodeId || !nomorDokumen) {
      return res.status(400).json({ error: "periodeId dan nomorDokumen wajib disertakan" });
    }

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });
    const sisaDana = Number(agg._sum.rab || 0) - Number(agg._sum.aktual || 0);

    const data = {
      nomorDokumen,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      sisaDana,
      tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? lembaga.awalPeriodeBerikutnya.toISOString().split("T")[0] : null,
      namaYayasan: lembaga.namaYayasan,
      ketuaYayasan: lembaga.ketuaYayasan,
      namaAkuntan: lembaga.namaAkuntanSPPG,
      namaPejabat: lembaga.namaKepalaSPPG,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
    };

    const html = renderBapsdHtml(data);

    let executablePath;
    let launchArgs = [];
    if (process.platform === 'win32') {
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      executablePath = await chromium.executablePath();
      launchArgs = chromium.args;
    }

    browser = await puppeteer.launch({
      args: launchArgs.length ? launchArgs : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport || null,
      executablePath,
      headless: chromium.headless || true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BAPSD-${nomorDokumen.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[bapsd/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BAPSD" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/kebutuhan-belanja-bahan - Kebutuhan Belanja Bahan
router.get("/kebutuhan-belanja-bahan", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, tanggalMulai, tanggalSelesai } = req.query;
    if (!periodeId || !tanggalMulai || !tanggalSelesai) {
      return res.status(400).json({ error: "periodeId, tanggalMulai, dan tanggalSelesai wajib disertakan" });
    }

    const start = normalizeDateUTC(tanggalMulai);
    const end = normalizeDateUTC(tanggalSelesai);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // 1. Fetch all MenuHarian DISETUJUI in date range
    const menus = await prisma.menuHarian.findMany({
      where: {
        periodeId,
        tanggal: { gte: start, lte: end },
        status: "DISETUJUI"
      },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: {
              include: { kategoriPenerima: true }
            },
            menuItem: {
              include: {
                bahan: {
                  include: { bahanPokok: true }
                }
              }
            }
          }
        }
      }
    });

    // 2. Fetch all InputPenerimaManfaat once to avoid N+1 query
    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true }
    });

    const akumulasiBahan = {};

    for (const menu of menus) {
      const day = new Date(menu.tanggal).getUTCDay();
      const dayOfWeek = HARI_MAP[day];
      if (!dayOfWeek) continue; // Skip Sunday/Invalid days

      // Filter active inputs for this day of week in memory
      const inputsForDay = activeInputs.filter(inp => inp.hariAktif.includes(dayOfWeek));

      const porsiPerKategori = {};
      for (const input of inputsForDay) {
        for (const det of input.detail) {
          porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
        }
      }

      for (const blok of menu.blok) {
        const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);

        for (const item of blok.menuItem) {
          for (const b of item.bahan) {
            const bid = b.bahanPokokId;
            if (!akumulasiBahan[bid]) {
              akumulasiBahan[bid] = {
                id: bid,
                nama: b.bahanPokok.nama,
                satuan: b.bahanPokok.satuan,
                totalBeratKotorGr: 0,
                totalBeratBersihGr: 0,
                totalEstimasiBiaya: 0
              };
            }
            akumulasiBahan[bid].totalBeratKotorGr += Number(b.beratKotorGr) * totalPorsiBlok;
            akumulasiBahan[bid].totalBeratBersihGr += Number(b.beratBersihGr) * totalPorsiBlok;
            akumulasiBahan[bid].totalEstimasiBiaya += Number(b.totalHargaBahan) * totalPorsiBlok;
          }
        }
      }
    }

    res.json({ success: true, data: Object.values(akumulasiBahan) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses kebutuhan belanja bahan" });
  }
});

// GET /api/laporan/per-periode - Laporan Per Periode (Pendidikan & Posyandu)
router.get("/per-periode", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const details = await prisma.anggaranBahanMakananDetail.findMany({
      where: { anggaranHarian: { periodeId } },
      include: { kategori: true }
    });

    let rabPendidikan = 0;
    let rabPosyandu = 0;

    for (const det of details) {
      const subtotal = Number(det.jumlahPaket) * Number(det.hargaSatuan);
      if (det.kategori.jenisSasaran === "PESERTA_DIDIK") {
        rabPendidikan += subtotal;
      } else {
        rabPosyandu += subtotal;
      }
    }

    const bahanAgg = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "BAHAN_MAKANAN" },
      _sum: { aktual: true }
    });
    const totalAktualBahan = Number(bahanAgg._sum.aktual || 0);

    const totalRabBahan = rabPendidikan + rabPosyandu;
    const rasioPendidikan = totalRabBahan > 0 ? rabPendidikan / totalRabBahan : 0;
    const aktualPendidikan = totalAktualBahan * rasioPendidikan;
    const aktualPosyandu = totalAktualBahan * (1 - rasioPendidikan);

    const operasional = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "OPERASIONAL" },
      _sum: { rab: true, aktual: true }
    });
    const sewa = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" },
      _sum: { rab: true, aktual: true }
    });

    res.json({
      success: true,
      data: {
        bahanMakanan: {
          pendidikan: {
            rab: rabPendidikan,
            aktual: aktualPendidikan,
            selisih: rabPendidikan - aktualPendidikan,
            metodeAlokasi: "PROPORSIONAL_RAB"
          },
          posyandu: {
            rab: rabPosyandu,
            aktual: aktualPosyandu,
            selisih: rabPosyandu - aktualPosyandu,
            metodeAlokasi: "PROPORSIONAL_RAB"
          }
        },
        operasional: {
          rab: Number(operasional._sum.rab || 0),
          aktual: Number(operasional._sum.aktual || 0),
          selisih: Number(operasional._sum.rab || 0) - Number(operasional._sum.aktual || 0)
        },
        insentifFasilitas: {
          rab: Number(sewa._sum.rab || 0),
          aktual: Number(sewa._sum.aktual || 0),
          selisih: Number(sewa._sum.rab || 0) - Number(sewa._sum.aktual || 0)
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses laporan per periode" });
  }
});

// GET /api/laporan/per-bulan - Laporan Per Bulan
router.get("/per-bulan", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const jurnal = await prisma.jurnalTransaksi.findMany({
      where: { periodeId },
      orderBy: { tanggal: "asc" }
    });

    const dataBulanan = {};
    for (const row of jurnal) {
      const month = row.tanggal.getUTCMonth() + 1;
      const year = row.tanggal.getUTCFullYear();
      const key = `${year}-${String(month).padStart(2, "0")}`;

      if (!dataBulanan[key]) {
        dataBulanan[key] = { key, year, month, totalMasuk: 0, totalKeluar: 0 };
      }
      if (row.jenis === "MASUK") {
        dataBulanan[key].totalMasuk += Number(row.nominal);
      } else {
        dataBulanan[key].totalKeluar += Number(row.nominal);
      }
    }

    res.json({
      success: true,
      data: Object.values(dataBulanan).sort((a, b) => a.key.localeCompare(b.key))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses laporan per bulan" });
  }
});

// GET /api/laporan/stock-barang - Laporan Stock Barang (Persediaan)
router.get("/stock-barang", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;
    if (!periodeId || !tanggal) {
      return res.status(400).json({ error: "periodeId dan tanggal wajib disertakan" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // Fetch periode first
    const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });

    // 1. Fetch active ingredients, initial balance, mutasi, and latest prices (optimized Distinct)
    const [bahanList, saldoAwalList, mutasiList, latestMasukPrices] = await Promise.all([
      prisma.bahanPokok.findMany({ where: { aktif: true } }),
      prisma.saldoAwalBarang.findMany({ where: { periodeId } }),
      prisma.mutasiStok.groupBy({
        by: ["bahanPokokId", "jenis"],
        where: {
          tanggal: { gte: periode.tanggalMulai, lte: targetTanggal }
        },
        _sum: { qty: true }
      }),
      prisma.mutasiStok.findMany({
        where: {
          jenis: "MASUK",
          tanggal: { lte: targetTanggal }
        },
        orderBy: [
          { bahanPokokId: "asc" },
          { tanggal: "desc" },
          { createdAt: "desc" }
        ],
        distinct: ["bahanPokokId"],
        select: {
          bahanPokokId: true,
          hargaBeli: true
        }
      })
    ]);

    const saldoAwalMap = {};
    for (const s of saldoAwalList) {
      saldoAwalMap[s.bahanPokokId] = {
        qty: Number(s.saldoAwalQty),
        harga: Number(s.hargaBeliAwal)
      };
    }

    const mutasiMap = {};
    for (const m of mutasiList) {
      const bid = m.bahanPokokId;
      if (!mutasiMap[bid]) mutasiMap[bid] = { masuk: 0, keluar: 0 };
      if (m.jenis === "MASUK") {
        mutasiMap[bid].masuk = Number(m._sum.qty || 0);
      } else {
        mutasiMap[bid].keluar = Number(m._sum.qty || 0);
      }
    }

    const latestHargaMap = {};
    for (const m of latestMasukPrices) {
      latestHargaMap[m.bahanPokokId] = Number(m.hargaBeli);
    }

    const data = bahanList.map((bahan) => {
      const sa = saldoAwalMap[bahan.id] || { qty: 0, harga: 0 };
      const mut = mutasiMap[bahan.id] || { masuk: 0, keluar: 0 };
      const saldoAkhirQty = sa.qty + mut.masuk - mut.keluar;

      const hargaBeliTerakhir = latestHargaMap[bahan.id] !== undefined
        ? latestHargaMap[bahan.id]
        : sa.harga;

      return {
        bahanPokokId: bahan.id,
        nama: bahan.nama,
        satuan: bahan.satuan,
        saldoAwalQty: sa.qty,
        totalMasukQty: mut.masuk,
        totalKeluarQty: mut.keluar,
        saldoAkhirQty,
        hargaBeliTerakhir,
        nilaiStock: saldoAkhirQty * hargaBeliTerakhir
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses stock barang" });
  }
});

module.exports = router;
