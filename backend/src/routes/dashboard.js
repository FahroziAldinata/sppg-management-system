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

    // Kembalikan respon sukses { success: true, data }
    res.status(200).json({
      success: true,
      data: {
        saldoKasBku: saldo.toNumber(),
        metrics: {
          totalMenuHariDisusun,
          totalMenuHariDisetujui
        }
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
