const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { Prisma } = require('@prisma/client');

router.get('/summary', requireAuth, async (req, res) => {
  const { periodeId } = req.query;

  if (!periodeId) {
    return res.status(400).json({
      error: 'Query parameter periodeId wajib diisi'
    });
  }

  try {
    // 1. Validasi keberadaan periode
    const periode = await prisma.periode.findUnique({
      where: { id: periodeId }
    });

    if (!periode) {
      return res.status(404).json({
        error: 'Periode tidak ditemukan'
      });
    }

    // 2. Semua query dijalankan paralel dalam 1 Promise.all
    const [
      // saldoKasBku — pola generateBKU (06-QUERY-REFERENCE.md)
      saldoAwalAgg,
      jurnal,
      // penerima manfaat
      pmDetails,
      // estimasi biaya (3 kategori)
      anggaranBahanMakanan,
      anggaranOperasional,
      anggaranInsentif,
      // notifikasi
      hargaBelumUpdate,
      anggaranMinus,
      selisihStok,
      // workflowProgress (8 query paralel)
      setupLembaga,
      inputPM,
      hargaBahan,
      totalMenu,
      menuDisetujui,
      transaksiPO,
      rabTotal,
      rabDisetujui,
    ] = await Promise.all([
      // --- saldoKasBku ---
      prisma.saldoAwalPeriode.aggregate({
        where: { periodeId, akun: { tipe: 'KAS' } },
        _sum: { saldoAwal: true },
      }),
      prisma.jurnalTransaksi.findMany({
        where: { periodeId },
        orderBy: [{ tanggal: 'asc' }, { nomorBukti: 'asc' }],
        select: { jenis: true, nominal: true },
      }),
      // --- penerima manfaat ---
      prisma.inputPenerimaManfaatDetail.findMany({
        where: { inputPenerimaManfaat: { periodeId } },
        select: {
          lakiLaki: true,
          perempuan: true,
          kategori: { select: { jenisPorsi: true } },
        },
      }),
      // --- estimasi biaya ---
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: 'BAHAN_MAKANAN' },
        _sum: { rab: true },
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: 'OPERASIONAL' },
        _sum: { rab: true },
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: 'INSENTIF_FASILITAS' },
        _sum: { rab: true },
      }),
      // --- notifikasi ---
      prisma.bahanPokok.count({
        where: { aktif: true, hargaPeriode: { none: { periodeId } } },
      }),
      prisma.anggaranHarian.count({
        where: { periodeId, selisih: { lt: 0 } },
      }),
      prisma.validasiStok.count({
        where: {
          tanggal: { gte: periode.tanggalMulai, lte: periode.tanggalSelesai },
          selisih: { not: 0 },
        },
      }),
      // --- workflowProgress (8 query) ---
      prisma.setupLembaga.findFirst({ where: { periodeId }, select: { id: true } }),
      prisma.inputPenerimaManfaat.findFirst({ where: { periodeId }, select: { id: true } }),
      prisma.hargaBahanPeriode.findFirst({ where: { periodeId }, select: { id: true } }),
      prisma.menuHarian.count({ where: { periodeId } }),
      prisma.menuHarian.count({ where: { periodeId, status: 'DISETUJUI' } }),
      prisma.transaksiPembelian.findFirst({ where: { rabHarian: { periodeId } }, select: { id: true } }),
      prisma.rabHarian.count({ where: { periodeId } }),
      prisma.rabHarian.count({ where: { periodeId, status: 'DISETUJUI' } }),
    ]);

    // --- Compute: saldoKasBku ---
    // Saldo awal KAS + iterasi jurnal (MASUK tambah, KELUAR kurang)
    let saldo = saldoAwalAgg._sum.saldoAwal ?? new Prisma.Decimal(0);
    jurnal.forEach((row) => {
      saldo = row.jenis === 'MASUK'
        ? saldo.plus(row.nominal)
        : saldo.minus(row.nominal);
    });

    // --- Compute: totalPenerimaManfaat ---
    let porsiKecil = 0, porsiBesar = 0;
    for (const d of pmDetails) {
      const jumlah = d.lakiLaki + d.perempuan;
      if (d.kategori.jenisPorsi === 'KECIL') porsiKecil += jumlah;
      else if (d.kategori.jenisPorsi === 'BESAR') porsiBesar += jumlah;
      // null/undefined → sengaja diabaikan, gak masuk kecil maupun besar
    }

    // --- Compute: totalEstimasiBiaya ---
    const totalEstimasiBiaya = [anggaranBahanMakanan, anggaranOperasional, anggaranInsentif]
      .reduce((acc, agg) => acc.plus(agg._sum.rab ?? new Prisma.Decimal(0)), new Prisma.Decimal(0));

    // --- Compute: notifikasiPenting ---
    // menuBelumDisetujui diambil dari hasil yang sudah ada — tidak perlu query ulang
    const menuBelumDisetujui = totalMenu - menuDisetujui;
    const notifikasiRaw = [
      { key: 'hargaBelumUpdate',   label: 'Bahan pokok belum ada harga periode ini', count: hargaBelumUpdate },
      { key: 'menuBelumDisetujui', label: 'Menu harian belum disetujui',              count: menuBelumDisetujui },
      { key: 'anggaranMinus',      label: 'Anggaran harian melebihi RAB',             count: anggaranMinus },
      { key: 'selisihStok',        label: 'Validasi stok ada selisih',                count: selisihStok },
    ];
    const notifikasiPenting = notifikasiRaw.filter(n => n.count > 0);

    // --- Compute: workflowProgress ---
    // Stage 4: [ASUMSI] threshold 80% menu disetujui = IN_PROGRESS → COMPLETED
    //          angka 80% belum dikonfirmasi user — ubah jika ada aturan resmi
    const pctMenuDisetujui = totalMenu > 0 ? menuDisetujui / totalMenu : 0;
    const stage4Status = totalMenu === 0
      ? 'PENDING'
      : pctMenuDisetujui >= 0.8   // [ASUMSI] 80% — belum dikonfirmasi user
        ? 'COMPLETED'
        : 'IN_PROGRESS';

    // Stage 6: rabTotal===0 → PENDING langsung (tidak ada RAB sama sekali)
    const stage6Status = rabTotal === 0
      ? 'PENDING'
      : (menuDisetujui === totalMenu && rabDisetujui === rabTotal)
        ? 'COMPLETED'
        : 'IN_PROGRESS';

    const stages = [
      { stage: 1, name: 'Setup Periode & Lembaga',     status: setupLembaga ? 'COMPLETED' : 'PENDING' },
      { stage: 2, name: 'Input Penerima Manfaat',      status: inputPM      ? 'COMPLETED' : 'PENDING' },
      { stage: 3, name: 'Daftar Harga Bahan Pokok',    status: hargaBahan   ? 'COMPLETED' : 'PENDING' },
      { stage: 4, name: 'Penyusunan Menu Harian',      status: stage4Status },
      { stage: 5, name: 'Pembuatan PO (Nota Pesanan)', status: transaksiPO  ? 'COMPLETED' : 'PENDING' },
      { stage: 6, name: 'Persetujuan Kepala SPPG',     status: stage6Status },
    ];

    // currentStage: tahap PERTAMA yang belum COMPLETED (bottleneck workflow)
    const currentStage = stages.find(s => s.status !== 'COMPLETED')?.stage ?? 6;

    res.status(200).json({
      success: true,
      data: {
        periodeAktif: {
          id: periode.id,
          tanggalMulai: periode.tanggalMulai,
          tanggalSelesai: periode.tanggalSelesai,
          status: periode.status,
        },
        saldoKasBku: saldo.toNumber(),
        metrics: {
          totalMenuHariDisusun: totalMenu,
          totalMenuHariDisetujui: menuDisetujui,
        },
        totalPenerimaManfaat: {
          porsiKecil,
          porsiBesar,
          total: porsiKecil + porsiBesar,
        },
        totalEstimasiBiaya: totalEstimasiBiaya.toNumber(),
        notifikasiPenting,
        workflowProgress: { currentStage, stages },
      },
    });
  } catch (error) {
    console.error('Error on /api/dashboard/summary:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan internal server saat memuat ringkasan'
    });
  }
});

module.exports = router;
