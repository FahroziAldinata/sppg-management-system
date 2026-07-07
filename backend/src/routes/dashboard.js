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
    // 1. Validasi keberadaan periode terlebih dahulu
    const periode = await prisma.periode.findUnique({
      where: { id: periodeId }
    });

    if (!periode) {
      return res.status(404).json({
        error: 'Periode tidak ditemukan'
      });
    }

    // 2. Hitung saldoKasBku (sesuai logic Buku Kas Umum)
    const saldoAwalAgg = await prisma.saldoAwalPeriode.aggregate({
      where: { 
        periodeId, 
        akun: { tipe: 'KAS' } 
      },
      _sum: { saldoAwal: true }
    });
    
    let saldo = saldoAwalAgg._sum.saldoAwal || new Prisma.Decimal(0);

    const jurnal = await prisma.jurnalTransaksi.findMany({
      where: { periodeId },
      select: {
        jenis: true,
        nominal: true
      }
    });

    for (const row of jurnal) {
      if (row.jenis === 'MASUK') {
        saldo = saldo.plus(row.nominal);
      } else if (row.jenis === 'KELUAR') {
        saldo = saldo.minus(row.nominal);
      }
    }

    // 3. Hitung metrics.totalMenuHariDisusun (seluruh record MenuHarian)
    const totalMenuHariDisusun = await prisma.menuHarian.count({
      where: { periodeId }
    });

    // 4. Hitung metrics.totalMenuHariDisetujui (MenuHarian dengan status DISETUJUI)
    const totalMenuHariDisetujui = await prisma.menuHarian.count({
      where: { 
        periodeId, 
        status: 'DISETUJUI' 
      }
    });

    // 5. totalPenerimaManfaat — SUM lakiLaki+perempuan, breakdown via jenisPorsi
    const pmDetails = await prisma.inputPenerimaManfaatDetail.findMany({
      where: {
        inputPenerimaManfaat: { periodeId }
      },
      select: {
        lakiLaki: true,
        perempuan: true,
        kategori: {
          select: { jenisPorsi: true }
        }
      }
    });

    let porsiKecil = 0;
    let porsiBesar = 0;
    for (const d of pmDetails) {
      const jumlah = d.lakiLaki + d.perempuan;
      if (d.kategori.jenisPorsi === 'KECIL') {
        porsiKecil += jumlah;
      } else {
        // BESAR atau null — default BESAR
        porsiBesar += jumlah;
      }
    }

    // 6. totalEstimasiBiaya — reuse getRealisasiPeriode pattern (SUM rab 3 kategori)
    const kategoris = ['BAHAN_MAKANAN', 'OPERASIONAL', 'INSENTIF_FASILITAS'];
    const anggaranAggs = await Promise.all(
      kategoris.map(k =>
        prisma.anggaranHarian.aggregate({
          where: { periodeId, kategoriDana: k },
          _sum: { rab: true }
        })
      )
    );
    const totalEstimasiBiaya = anggaranAggs.reduce(
      (acc, agg) => acc.plus(agg._sum.rab || new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    );

    // 7. notifikasiPenting — 4 binary flag counts
    // 7a. hargaBelumUpdate: BahanPokok aktif TANPA HargaBahanPeriode di periodeId ini
    const hargaBelumUpdate = await prisma.bahanPokok.count({
      where: {
        aktif: true,
        hargaPeriode: {
          none: { periodeId }
        }
      }
    });

    // 7b. menuBelumDisetujui: MenuHarian di periodeId, status != DISETUJUI
    const menuBelumDisetujui = await prisma.menuHarian.count({
      where: {
        periodeId,
        status: { not: 'DISETUJUI' }
      }
    });

    // 7c. anggaranMinus: AnggaranHarian di periodeId, selisih < 0 (rab - aktual)
    const anggaranMinus = await prisma.anggaranHarian.count({
      where: {
        periodeId,
        selisih: { lt: 0 }
      }
    });

    // 7d. selisihStok: ValidasiStok di rentang tanggal periode, selisih != 0
    //     ValidasiStok TIDAK punya periodeId FK — filter by tanggal range
    const selisihStok = await prisma.validasiStok.count({
      where: {
        tanggal: {
          gte: periode.tanggalMulai,
          lte: periode.tanggalSelesai
        },
        selisih: { not: 0 }
      }
    });

    // Build notifikasi array — hanya entry dgn count > 0 yang dikirim
    const notifikasiRaw = [
      { key: 'hargaBelumUpdate', label: 'Bahan pokok belum ada harga periode ini', count: hargaBelumUpdate },
      { key: 'menuBelumDisetujui', label: 'Menu harian belum disetujui', count: menuBelumDisetujui },
      { key: 'anggaranMinus', label: 'Anggaran harian melebihi RAB', count: anggaranMinus },
      { key: 'selisihStok', label: 'Validasi stok ada selisih', count: selisihStok }
    ];
    const notifikasiPenting = notifikasiRaw.filter(n => n.count > 0);

    // Kembalikan respon sukses { success: true, data }
    res.status(200).json({
      success: true,
      data: {
        periodeAktif: {
          id: periode.id,
          tanggalMulai: periode.tanggalMulai,
          tanggalSelesai: periode.tanggalSelesai,
          status: periode.status
        },
        saldoKasBku: saldo.toNumber(),
        metrics: {
          totalMenuHariDisusun,
          totalMenuHariDisetujui
        },
        totalPenerimaManfaat: {
          porsiKecil,
          porsiBesar,
          total: porsiKecil + porsiBesar
        },
        totalEstimasiBiaya: totalEstimasiBiaya.toNumber(),
        notifikasiPenting
      }
    });
  } catch (error) {
    console.error('Error on /api/dashboard/summary:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan internal server saat memuat ringkasan' 
    });
  }
});

module.exports = router;
