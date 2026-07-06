const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// KONTRAK: Field tanggal dari client WAJIB dikirim sebagai date-only string "YYYY-MM-DD"
// (tanpa ISO datetime dengan offset) agar tidak ada mismatch offset timezone.
function normalizeDateUTC(input) {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Helper to recalculate aktual and selisih of AnggaranHarian
async function recalcAktualAnggaran(tx, periodeId, tanggal, kategoriDana) {
  const targetDate = normalizeDateUTC(tanggal);

  const result = await tx.jurnalTransaksi.aggregate({
    _sum: {
      nominal: true
    },
    where: {
      periodeId,
      tanggal: targetDate,
      akunDanaBiaya: {
        kategoriDana,
        tipe: "BIAYA"
      }
    }
  });

  const sumNominal = result._sum.nominal ? parseFloat(result._sum.nominal) : 0;
  const roundedSum = Math.round(sumNominal * 100) / 100;

  const anggaran = await tx.anggaranHarian.findUnique({
    where: {
      periodeId_tanggal_kategoriDana: {
        periodeId,
        tanggal: targetDate,
        kategoriDana
      }
    }
  });

  if (anggaran) {
    const computedRab = parseFloat(anggaran.rab);
    const newSelisih = Math.round((computedRab - roundedSum) * 100) / 100;

    await tx.anggaranHarian.update({
      where: { id: anggaran.id },
      data: {
        aktual: roundedSum,
        selisih: newSelisih
      }
    });
  }
}


// ==========================================
// CRUD RAB HARIAN
// ==========================================

// POST /api/akuntan/rab-harian - Create RabHarian with optional TransaksiPembelian nested
router.post("/rab-harian", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, tanggal, transaksiPembelian } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }

    const targetTanggal = new Date(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1. Validate Periode exists via tx inside transaction
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // Validasi: tanggal wajib dalam rentang periode — FINAL, dikonfirmasi user
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal RAB harian harus berada di dalam batas rentang periode");
      }

      // 2. Create RabHarian (Unique constraint [periodeId, tanggal] handled via P2002 in catch block)
      const rabHarian = await tx.rabHarian.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          status: "DRAFT",
          createdById: req.user.sub
        }
      });

      // 3. Create nested TransaksiPembelian if provided
      if (transaksiPembelian && Array.isArray(transaksiPembelian)) {
        for (const tp of transaksiPembelian) {
          const { supplierId, catatan, items } = tp;
          if (!supplierId) {
            throw new Error("[VALIDASI] supplierId wajib diisi pada transaksi pembelian");
          }

          const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
          if (!supplier) {
            throw new Error(`[NOT_FOUND] Supplier dengan ID ${supplierId} tidak ditemukan`);
          }

          const createdTp = await tx.transaksiPembelian.create({
            data: {
              rabHarianId: rabHarian.id,
              supplierId,
              tanggal: targetTanggal,
              catatan
            }
          });

          // Create nested TransaksiPembelianItem
          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { bahanPokokId, qty, hargaSatuan } = item;
              if (!bahanPokokId) {
                throw new Error("[VALIDASI] bahanPokokId wajib diisi pada item transaksi");
              }

              const numQty = parseFloat(qty);
              const numHarga = parseFloat(hargaSatuan);

              if (isNaN(numQty) || numQty <= 0) {
                throw new Error("[VALIDASI] qty harus berupa angka positif");
              }
              if (isNaN(numHarga) || numHarga < 0) {
                throw new Error("[VALIDASI] hargaSatuan harus berupa angka non-negatif");
              }

              const bahan = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
              if (!bahan) {
                throw new Error(`[NOT_FOUND] Bahan pokok dengan ID ${bahanPokokId} tidak ditemukan`);
              }

              // Calculate subtotal on app-layer (qty * hargaSatuan), rounded to 2 decimal places to avoid floating point errors
              const subtotal = Math.round(numQty * numHarga * 100) / 100;

              await tx.transaksiPembelianItem.create({
                data: {
                  transaksiId: createdTp.id,
                  bahanPokokId,
                  qty: numQty,
                  hargaSatuan: numHarga,
                  subtotal
                }
              });
            }
          }
        }
      }

      // Return complete created RabHarian
      return await tx.rabHarian.findUnique({
        where: { id: rabHarian.id },
        include: {
          transaksiPembelian: {
            include: {
              items: {
                include: {
                  bahanPokok: true
                }
              },
              supplier: true
            }
          }
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "RAB harian untuk tanggal ini sudah terdaftar pada periode terpilih" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Periode, supplier, atau bahan pokok tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan RAB harian" });
  }
});

// GET /api/akuntan/rab-harian - List RabHarian
router.get("/rab-harian", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.rabHarian.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        transaksiPembelian: {
          include: {
            items: {
              include: {
                bahanPokok: true
              }
            },
            supplier: true
          }
        }
      },
      orderBy: { tanggal: "desc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar RAB harian" });
  }
});

// GET /api/akuntan/rab-harian/:id - Detail RabHarian
router.get("/rab-harian/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.rabHarian.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        transaksiPembelian: {
          include: {
            items: {
              include: {
                bahanPokok: true
              }
            },
            supplier: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data RAB harian tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail RAB harian" });
  }
});

// PUT /api/akuntan/rab-harian/:id - Update RabHarian (tanggal & status)
router.put("/rab-harian/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, status } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.rabHarian.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data RAB harian tidak ditemukan");
      }

      // Validasi status: Akuntan hanya dapat mengubah status ke DRAFT atau DIAJUKAN (FINAL v5.12).
      // Mengubah status ke DISETUJUI/DITOLAK secara langsung dilarang karena harus melalui alur approval Kepala SPPG.
      if (status !== undefined) {
        const allowedStatuses = ["DRAFT", "DIAJUKAN"];
        if (!allowedStatuses.includes(status)) {
          throw new Error("[VALIDASI] Mengubah status langsung ke DISETUJUI atau DITOLAK dilarang (harus melalui Kepala SPPG)");
        }
      }

      const targetTanggal = tanggal !== undefined ? new Date(tanggal) : existing.tanggal;
      if (tanggal !== undefined) {
        if (isNaN(targetTanggal.getTime())) {
          throw new Error("[VALIDASI] Format tanggal tidak valid");
        }

        // Re-validasi rentang tanggal terhadap Periode (FINAL v5.11)
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal RAB harian harus berada di dalam batas rentang periode");
        }

        // Conflict check (exclusion pattern)
        const conflict = await tx.rabHarian.findFirst({
          where: {
            periodeId: existing.periodeId,
            tanggal: targetTanggal,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] RAB harian untuk tanggal ini sudah terdaftar pada periode terpilih");
        }
      }

      return await tx.rabHarian.update({
        where: { id },
        data: {
          tanggal: tanggal !== undefined ? targetTanggal : undefined,
          status: status !== undefined ? status : undefined
        },
        include: {
          transaksiPembelian: {
            include: {
              items: {
                include: {
                  bahanPokok: true
                }
              },
              supplier: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "RAB harian untuk tanggal ini sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui RAB harian" });
  }
});

// DELETE /api/akuntan/rab-harian/:id - Delete RabHarian with manual cascade deletion of related child records
router.delete("/rab-harian/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.rabHarian.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data RAB harian tidak ditemukan" });
    }

    await prisma.$transaction(async (tx) => {
      // Get all transaksiPembelian ids for this RabHarian
      const tpList = await tx.transaksiPembelian.findMany({
        where: { rabHarianId: id },
        select: { id: true }
      });
      const tpIds = tpList.map(tp => tp.id);

      // 1. Check if any JurnalTransaksi refers to these TransaksiPembelian
      if (tpIds.length > 0) {
        const linkedJurnal = await tx.jurnalTransaksi.findFirst({
          where: { transaksiPembelianId: { in: tpIds } }
        });
        if (linkedJurnal) {
          throw new Error("[CONFLICT] RAB harian tidak bisa dihapus karena sudah memiliki transaksi jurnal terkait");
        }
      }

      // 2. Delete associated approvals
      await tx.approval.deleteMany({
        where: { rabHarianId: id }
      });

      // 3. Delete associated transaksiPembelian (which cascades to TransaksiPembelianItem in DB schema)
      await tx.transaksiPembelian.deleteMany({
        where: { rabHarianId: id }
      });

      // 4. Delete parent RabHarian
      await tx.rabHarian.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: "Data RAB harian beserta seluruh transaksi dan approval terkait berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data RAB harian tidak ditemukan" });
    }
    if (error.message) {
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
    }
    if (error.code === "P2003" || error.message?.includes("23001") || error.message?.includes("foreign key constraint")) {
      return res.status(409).json({ error: "RAB harian tidak dapat dihapus karena masih memiliki data terkait yang tidak bisa dihapus otomatis" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus RAB harian" });
  }
});

// ==========================================
// CRUD ANGGARAN HARIAN
// ==========================================

// POST /api/akuntan/anggaran-harian - Create AnggaranHarian with optional nested AnggaranBahanMakananDetail
router.post("/anggaran-harian", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, tanggal, kategoriDana, jumlahPaket, hargaSatuan, keterangan, detailBahanMakanan } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }
    if (!kategoriDana) {
      return res.status(400).json({ error: "kategoriDana wajib diisi" });
    }
    if (jumlahPaket === undefined || jumlahPaket === null) {
      return res.status(400).json({ error: "jumlahPaket wajib diisi" });
    }

    const targetTanggal = new Date(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1. Validate Periode exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 2. Validate date is within period range
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal anggaran harus berada di dalam batas rentang periode");
      }

      let computedRab = 0;
      let parentHargaSatuan = null;
      let detailsToCreate = [];

      if (kategoriDana === "BAHAN_MAKANAN") {
        if (!detailBahanMakanan || !Array.isArray(detailBahanMakanan) || detailBahanMakanan.length === 0) {
          throw new Error("[VALIDASI] detailBahanMakanan wajib diisi untuk kategori BAHAN_MAKANAN");
        }
        if (new Set(detailBahanMakanan.map(d => d.kategoriId)).size !== detailBahanMakanan.length) {
          throw new Error("[VALIDASI] Kategori penerima dalam rincian tidak boleh duplikat");
        }

        for (const item of detailBahanMakanan) {
          const { kategoriId, jumlahPaket: detailQty, hargaSatuan: detailHarga } = item;
          if (!kategoriId) {
            throw new Error("[VALIDASI] kategoriId wajib diisi pada rincian bahan makanan");
          }

          const q = parseInt(detailQty, 10);
          const h = parseFloat(detailHarga);

          if (isNaN(q) || q <= 0) {
            throw new Error("[VALIDASI] jumlahPaket pada rincian harus berupa angka bulat positif");
          }
          if (isNaN(h) || h < 0) {
            throw new Error("[VALIDASI] hargaSatuan pada rincian harus berupa angka non-negatif");
          }

          // Check if KategoriPenerima exists
          const kat = await tx.kategoriPenerima.findUnique({ where: { id: kategoriId } });
          if (!kat) {
            throw new Error(`[NOT_FOUND] Kategori penerima dengan ID ${kategoriId} tidak ditemukan`);
          }

          // Validasi batas harga porsi: Kategori tanpa jenisPorsi dilarang dianggarkan (FINAL v5.13)
          if (kat.jenisPorsi === null) {
            throw new Error(`[VALIDASI] Kategori ${kat.nama} belum memiliki jenis porsi terkonfirmasi, tidak dapat dianggarkan`);
          }

          const batas = await tx.batasHargaPorsi.findUnique({
            where: { jenisPorsi: kat.jenisPorsi }
          });
          // [ASUMSI] Jika row BatasHargaPorsi belum di-seed/ditemukan untuk jenis porsi ini, lewati pengecekan batas maksimal.
          if (batas && h > parseFloat(batas.batasMaksimal)) {
            throw new Error(`[VALIDASI] hargaSatuan kategori ${kat.nama} (${h}) melebihi batas maksimal porsi ${kat.jenisPorsi} (${batas.batasMaksimal})`);
          }

          const subtotal = Math.round(q * h * 100) / 100;
          computedRab += subtotal;

          detailsToCreate.push({
            kategoriId,
            jumlahPaket: q,
            hargaSatuan: h,
            subtotal
          });
        }
      } else {
        // OPERASIONAL / INSENTIF_FASILITAS
        if (hargaSatuan === undefined || hargaSatuan === null) {
          throw new Error("[VALIDASI] hargaSatuan wajib diisi untuk kategori non bahan makanan");
        }

        const h = parseFloat(hargaSatuan);
        if (isNaN(h) || h < 0) {
          throw new Error("[VALIDASI] hargaSatuan harus berupa angka non-negatif");
        }

        const q = parseInt(jumlahPaket, 10);
        if (isNaN(q) || q <= 0) {
          throw new Error("[VALIDASI] jumlahPaket harus berupa angka bulat positif");
        }

        parentHargaSatuan = h;
        computedRab = Math.round(q * h * 100) / 100;
      }

      // Create AnggaranHarian
      return await tx.anggaranHarian.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          kategoriDana,
          jumlahPaket: parseInt(jumlahPaket, 10),
          hargaSatuan: parentHargaSatuan,
          rab: computedRab,
          aktual: 0,
          selisih: computedRab, // rab - aktual (0)
          keterangan,
          detailBahanMakanan: {
            create: detailsToCreate
          }
        },
        include: {
          detailBahanMakanan: {
            include: {
              kategori: true
            }
          }
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Anggaran harian untuk tanggal dan kategori dana ini sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan anggaran harian" });
  }
});

// GET /api/akuntan/anggaran-harian - List AnggaranHarian
router.get("/anggaran-harian", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.anggaranHarian.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        detailBahanMakanan: {
          include: {
            kategori: true
          }
        }
      },
      orderBy: { tanggal: "desc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar anggaran harian" });
  }
});

// GET /api/akuntan/anggaran-harian/:id - Detail AnggaranHarian
router.get("/anggaran-harian/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.anggaranHarian.findUnique({
      where: { id },
      include: {
        detailBahanMakanan: {
          include: {
            kategori: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data anggaran harian tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail anggaran harian" });
  }
});

// PUT /api/akuntan/anggaran-harian/:id - Update AnggaranHarian
router.put("/anggaran-harian/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, kategoriDana, jumlahPaket, hargaSatuan, keterangan, detailBahanMakanan } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.anggaranHarian.findUnique({
        where: { id },
        include: { detailBahanMakanan: true }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data anggaran harian tidak ditemukan");
      }

      if (kategoriDana !== undefined && kategoriDana !== existing.kategoriDana && parseFloat(existing.aktual) !== 0) {
        throw new Error("[CONFLICT] Tidak bisa mengubah kategoriDana karena sudah ada transaksi aktual tercatat");
      }

      const targetTanggal = tanggal !== undefined ? new Date(tanggal) : existing.tanggal;
      if (tanggal !== undefined && isNaN(targetTanggal.getTime())) {
        throw new Error("[VALIDASI] Format tanggal tidak valid");
      }

      const targetKategoriDana = kategoriDana !== undefined ? kategoriDana : existing.kategoriDana;
      const targetJumlahPaket = jumlahPaket !== undefined ? parseInt(jumlahPaket, 10) : existing.jumlahPaket;
      if (isNaN(targetJumlahPaket) || targetJumlahPaket <= 0) {
        throw new Error("[VALIDASI] jumlahPaket harus berupa angka bulat positif");
      }

      // Check unique constraint excluding self
      if (tanggal !== undefined || kategoriDana !== undefined) {
        // Re-validasi rentang tanggal terhadap Periode (FINAL v5.11)
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal anggaran harus berada di dalam batas rentang periode");
        }

        const conflict = await tx.anggaranHarian.findFirst({
          where: {
            periodeId: existing.periodeId,
            tanggal: targetTanggal,
            kategoriDana: targetKategoriDana,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] Anggaran harian untuk tanggal dan kategori dana ini sudah terdaftar pada periode terpilih");
        }
      }

      let computedRab = 0;
      let parentHargaSatuan = existing.hargaSatuan ? parseFloat(existing.hargaSatuan) : null;
      let detailsToCreate = [];
      let shouldDeleteOldDetails = false;

      if (targetKategoriDana === "BAHAN_MAKANAN") {
        parentHargaSatuan = null;
        
        // If new details are provided, we use them. Otherwise, if we only updated e.g. tanggal, we keep existing details.
        // But if we switched kategoriDana to BAHAN_MAKANAN, detailBahanMakanan must be provided!
        if (detailBahanMakanan !== undefined) {
          if (!Array.isArray(detailBahanMakanan) || detailBahanMakanan.length === 0) {
            throw new Error("[VALIDASI] detailBahanMakanan wajib diisi untuk kategori BAHAN_MAKANAN");
          }
          if (new Set(detailBahanMakanan.map(d => d.kategoriId)).size !== detailBahanMakanan.length) {
            throw new Error("[VALIDASI] Kategori penerima dalam rincian tidak boleh duplikat");
          }
          
          shouldDeleteOldDetails = true;
          for (const item of detailBahanMakanan) {
            const { kategoriId, jumlahPaket: detailQty, hargaSatuan: detailHarga } = item;
            if (!kategoriId) {
              throw new Error("[VALIDASI] kategoriId wajib diisi pada rincian bahan makanan");
            }

            const q = parseInt(detailQty, 10);
            const h = parseFloat(detailHarga);

            if (isNaN(q) || q <= 0) {
              throw new Error("[VALIDASI] jumlahPaket pada rincian harus berupa angka bulat positif");
            }
            if (isNaN(h) || h < 0) {
              throw new Error("[VALIDASI] hargaSatuan pada rincian harus berupa angka non-negatif");
            }

            const kat = await tx.kategoriPenerima.findUnique({ where: { id: kategoriId } });
            if (!kat) {
              throw new Error(`[NOT_FOUND] Kategori penerima dengan ID ${kategoriId} tidak ditemukan`);
            }

            // Validasi batas harga porsi: Kategori tanpa jenisPorsi dilarang dianggarkan (FINAL v5.13)
            if (kat.jenisPorsi === null) {
              throw new Error(`[VALIDASI] Kategori ${kat.nama} belum memiliki jenis porsi terkonfirmasi, tidak dapat dianggarkan`);
            }

            const batas = await tx.batasHargaPorsi.findUnique({
              where: { jenisPorsi: kat.jenisPorsi }
            });
            // [ASUMSI] Jika row BatasHargaPorsi belum di-seed/ditemukan untuk jenis porsi ini, lewati pengecekan batas maksimal.
            if (batas && h > parseFloat(batas.batasMaksimal)) {
              throw new Error(`[VALIDASI] hargaSatuan kategori ${kat.nama} (${h}) melebihi batas maksimal porsi ${kat.jenisPorsi} (${batas.batasMaksimal})`);
            }

            const subtotal = Math.round(q * h * 100) / 100;
            computedRab += subtotal;

            detailsToCreate.push({
              kategoriId,
              jumlahPaket: q,
              hargaSatuan: h,
              subtotal
            });
          }
        } else {
          // No new details provided. If previously BAHAN_MAKANAN, we sum existing details.
          // If we switched from non-BAHAN_MAKANAN to BAHAN_MAKANAN without details, this is an error.
          if (existing.kategoriDana !== "BAHAN_MAKANAN") {
            throw new Error("[VALIDASI] detailBahanMakanan wajib diisi saat mengubah kategori ke BAHAN_MAKANAN");
          }
          
          // Recompute RAB from existing details
          computedRab = existing.detailBahanMakanan.reduce((acc, det) => {
            return acc + parseFloat(det.subtotal);
          }, 0);
          computedRab = Math.round(computedRab * 100) / 100;
        }
      } else {
        // OPERASIONAL / INSENTIF_FASILITAS
        // If we switched to non-BAHAN_MAKANAN, delete old details
        if (existing.kategoriDana === "BAHAN_MAKANAN") {
          shouldDeleteOldDetails = true;
        }

        const currentHargaSatuan = hargaSatuan !== undefined ? hargaSatuan : parentHargaSatuan;
        if (currentHargaSatuan === undefined || currentHargaSatuan === null) {
          throw new Error("[VALIDASI] hargaSatuan wajib diisi untuk kategori non bahan makanan");
        }

        const h = parseFloat(currentHargaSatuan);
        if (isNaN(h) || h < 0) {
          throw new Error("[VALIDASI] hargaSatuan harus berupa angka non-negatif");
        }

        parentHargaSatuan = h;
        computedRab = Math.round(targetJumlahPaket * h * 100) / 100;
      }

      // Execute Replace All if flag is active
      // [ASUMSI] detailBahanMakanan di-update dengan strategi Replace-All (deleteOld + createNew) untuk menjamin kesederhanaan dan konsistensi data.
      if (shouldDeleteOldDetails) {
        await tx.anggaranBahanMakananDetail.deleteMany({
          where: { anggaranHarianId: id }
        });
      }

      const currentAktual = parseFloat(existing.aktual);
      const newSelisih = Math.round((computedRab - currentAktual) * 100) / 100;

      return await tx.anggaranHarian.update({
        where: { id },
        data: {
          tanggal: tanggal !== undefined ? targetTanggal : undefined,
          kategoriDana: kategoriDana !== undefined ? targetKategoriDana : undefined,
          jumlahPaket: targetJumlahPaket,
          hargaSatuan: parentHargaSatuan,
          rab: computedRab,
          selisih: newSelisih,
          keterangan: keterangan !== undefined ? keterangan : undefined,
          detailBahanMakanan: detailsToCreate.length > 0 ? {
            create: detailsToCreate
          } : undefined
        },
        include: {
          detailBahanMakanan: {
            include: {
              kategori: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Anggaran harian untuk tanggal dan kategori dana ini sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui anggaran harian" });
  }
});

// DELETE /api/akuntan/anggaran-harian/:id - Delete AnggaranHarian
router.delete("/anggaran-harian/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.anggaranHarian.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data anggaran harian tidak ditemukan" });
    }

    // TODO: wrap in $transaction + re-check aktual saat modul JurnalTransaksi/recalcAktualAnggaran mulai jalan, race TOCTOU jadi nyata.
    if (parseFloat(exists.aktual) !== 0) {
      return res.status(409).json({ error: "Anggaran harian tidak bisa dihapus karena sudah memiliki transaksi aktual terkait" });
    }

    await prisma.anggaranHarian.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data anggaran harian berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data anggaran harian tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus anggaran harian" });
  }
});

// ==========================================
// CRUD JURNAL TRANSAKSI
// ==========================================

// POST /api/akuntan/jurnal-transaksi - Create JurnalTransaksi
router.post("/jurnal-transaksi", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const {
      periodeId,
      tanggal,
      uraian,
      jenis,
      nominal,
      akunDanaBiayaId,
      akunKasId,
      tagPengeluaran,
      transaksiPembelianId
    } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }
    if (!uraian) {
      return res.status(400).json({ error: "uraian wajib diisi" });
    }
    if (!jenis || (jenis !== "MASUK" && jenis !== "KELUAR")) {
      return res.status(400).json({ error: "jenis transaksi tidak valid (MASUK atau KELUAR)" });
    }
    if (nominal === undefined || nominal === null) {
      return res.status(400).json({ error: "nominal wajib diisi" });
    }

    const parsedNominal = parseFloat(nominal);
    if (isNaN(parsedNominal) || parsedNominal <= 0) {
      return res.status(400).json({ error: "nominal harus berupa angka positif" });
    }

    if (!akunDanaBiayaId) {
      return res.status(400).json({ error: "akunDanaBiayaId wajib diisi" });
    }
    if (!akunKasId) {
      return res.status(400).json({ error: "akunKasId wajib diisi" });
    }

    if (akunDanaBiayaId === akunKasId) {
      return res.status(400).json({ error: "akunDanaBiayaId dan akunKasId tidak boleh sama" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1. Lock Periode to prevent race conditions on nomorBukti calculation
      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;

      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 2. Validate tanggal is within period range
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal transaksi harus berada di dalam batas rentang periode");
      }

      // 3. Validate accounts exist and are active
      const akunDanaBiaya = await tx.akun.findUnique({ where: { id: akunDanaBiayaId } });
      if (!akunDanaBiaya) {
        throw new Error("[NOT_FOUND] Akun Dana/Biaya tidak ditemukan");
      }
      if (!akunDanaBiaya.aktif) {
        throw new Error("[VALIDASI] Akun Dana/Biaya tidak aktif");
      }

      const akunKas = await tx.akun.findUnique({ where: { id: akunKasId } });
      if (!akunKas) {
        throw new Error("[NOT_FOUND] Akun Kas tidak ditemukan");
      }
      if (!akunKas.aktif) {
        throw new Error("[VALIDASI] Akun Kas tidak aktif");
      }

      // 4. Validate transaksiPembelian exists if provided
      if (transaksiPembelianId) {
        const tp = await tx.transaksiPembelian.findUnique({ where: { id: transaksiPembelianId } });
        if (!tp) {
          throw new Error("[NOT_FOUND] Transaksi pembelian tidak ditemukan");
        }
      }

      // 5. Calculate nomorBukti (auto-increment manual per periode)
      const maxBukti = await tx.jurnalTransaksi.aggregate({
        _max: {
          nomorBukti: true
        },
        where: {
          periodeId
        }
      });
      const nextNomorBukti = (maxBukti._max.nomorBukti || 0) + 1;

      // 6. Create JurnalTransaksi
      const jurnal = await tx.jurnalTransaksi.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          nomorBukti: nextNomorBukti,
          uraian,
          jenis,
          nominal: Math.round(parsedNominal * 100) / 100, // round to 2 decimals
          akunDanaBiayaId,
          akunKasId,
          tagPengeluaran,
          transaksiPembelianId,
          createdById: req.user.sub
        },
        include: {
          akunDanaBiaya: true,
          akunKas: true
        }
      });

      // 7. Recalculate AnggaranHarian.aktual if account has kategoriDana
      if (akunDanaBiaya.kategoriDana) {
        await recalcAktualAnggaran(tx, periodeId, targetTanggal, akunDanaBiaya.kategoriDana);
      }

      return jurnal;
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Nomor bukti transaksi sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan jurnal transaksi" });
  }
});

// GET /api/akuntan/jurnal-transaksi - List JurnalTransaksi
router.get("/jurnal-transaksi", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.jurnalTransaksi.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        akunDanaBiaya: true,
        akunKas: true
      },
      orderBy: [
        { tanggal: "desc" },
        { nomorBukti: "desc" }
      ]
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar jurnal transaksi" });
  }
});

// GET /api/akuntan/jurnal-transaksi/:id - Detail JurnalTransaksi
router.get("/jurnal-transaksi/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.jurnalTransaksi.findUnique({
      where: { id },
      include: {
        akunDanaBiaya: true,
        akunKas: true
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data jurnal transaksi tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail jurnal transaksi" });
  }
});

// PUT /api/akuntan/jurnal-transaksi/:id - Update JurnalTransaksi
router.put("/jurnal-transaksi/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tanggal,
      uraian,
      jenis,
      nominal,
      akunDanaBiayaId,
      akunKasId,
      tagPengeluaran,
      transaksiPembelianId
    } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.jurnalTransaksi.findUnique({
        where: { id },
        include: { akunDanaBiaya: true }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data jurnal transaksi tidak ditemukan");
      }

      const targetTanggal = tanggal !== undefined ? normalizeDateUTC(tanggal) : existing.tanggal;
      if (tanggal !== undefined && isNaN(targetTanggal.getTime())) {
        throw new Error("[VALIDASI] Format tanggal tidak valid");
      }

      const targetAkunDanaBiayaId = akunDanaBiayaId !== undefined ? akunDanaBiayaId : existing.akunDanaBiayaId;
      const targetAkunKasId = akunKasId !== undefined ? akunKasId : existing.akunKasId;

      if (targetAkunDanaBiayaId === targetAkunKasId) {
        throw new Error("[VALIDASI] akunDanaBiayaId dan akunKasId tidak boleh sama");
      }

      const targetNominal = nominal !== undefined ? parseFloat(nominal) : parseFloat(existing.nominal);
      if (isNaN(targetNominal) || targetNominal <= 0) {
        throw new Error("[VALIDASI] nominal harus berupa angka positif");
      }

      const targetUraian = uraian !== undefined ? uraian : existing.uraian;
      if (!targetUraian) {
        throw new Error("[VALIDASI] uraian tidak boleh kosong");
      }

      const targetJenis = jenis !== undefined ? jenis : existing.jenis;
      if (targetJenis !== "MASUK" && targetJenis !== "KELUAR") {
        throw new Error("[VALIDASI] jenis transaksi tidak valid (MASUK atau KELUAR)");
      }

      let newAkunDanaBiaya = existing.akunDanaBiaya;
      if (akunDanaBiayaId !== undefined && akunDanaBiayaId !== existing.akunDanaBiayaId) {
        const checkDanaBiaya = await tx.akun.findUnique({ where: { id: akunDanaBiayaId } });
        if (!checkDanaBiaya) {
          throw new Error("[NOT_FOUND] Akun Dana/Biaya tidak ditemukan");
        }
        if (!checkDanaBiaya.aktif) {
          throw new Error("[VALIDASI] Akun Dana/Biaya tidak aktif");
        }
        newAkunDanaBiaya = checkDanaBiaya;
      }

      if (akunKasId !== undefined && akunKasId !== existing.akunKasId) {
        const checkKas = await tx.akun.findUnique({ where: { id: akunKasId } });
        if (!checkKas) {
          throw new Error("[NOT_FOUND] Akun Kas tidak ditemukan");
        }
        if (!checkKas.aktif) {
          throw new Error("[VALIDASI] Akun Kas tidak aktif");
        }
      }

      if (transaksiPembelianId !== undefined && transaksiPembelianId !== existing.transaksiPembelianId && transaksiPembelianId !== null) {
        const tp = await tx.transaksiPembelian.findUnique({ where: { id: transaksiPembelianId } });
        if (!tp) {
          throw new Error("[NOT_FOUND] Transaksi pembelian tidak ditemukan");
        }
      }

      if (tanggal !== undefined) {
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal transaksi harus berada di dalam batas rentang periode");
        }
      }

      const oldKategori = existing.akunDanaBiaya.kategoriDana;
      const oldTanggal = existing.tanggal;

      const result = await tx.jurnalTransaksi.update({
        where: { id },
        data: {
          tanggal: targetTanggal,
          uraian: targetUraian,
          jenis: targetJenis,
          nominal: Math.round(targetNominal * 100) / 100,
          akunDanaBiayaId: targetAkunDanaBiayaId,
          akunKasId: targetAkunKasId,
          tagPengeluaran: tagPengeluaran !== undefined ? tagPengeluaran : undefined,
          transaksiPembelianId: transaksiPembelianId !== undefined ? transaksiPembelianId : undefined
        },
        include: {
          akunDanaBiaya: true,
          akunKas: true
        }
      });

      if (oldKategori) {
        await recalcAktualAnggaran(tx, existing.periodeId, oldTanggal, oldKategori);
      }

      const newKategori = result.akunDanaBiaya.kategoriDana;
      const newTanggal = result.tanggal;

      const isSameBudgetLine =
        oldKategori === newKategori &&
        oldTanggal.getTime() === newTanggal.getTime();

      if (newKategori && !isSameBudgetLine) {
        await recalcAktualAnggaran(tx, existing.periodeId, newTanggal, newKategori);
      }

      return result;
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui jurnal transaksi" });
  }
});

// DELETE /api/akuntan/jurnal-transaksi/:id - Delete JurnalTransaksi
router.delete("/jurnal-transaksi/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.jurnalTransaksi.findUnique({
        where: { id },
        include: { akunDanaBiaya: true }
      });

      if (!existing) {
        throw new Error("[NOT_FOUND] Data jurnal transaksi tidak ditemukan");
      }

      const oldKategori = existing.akunDanaBiaya.kategoriDana;
      const oldTanggal = existing.tanggal;

      const result = await tx.jurnalTransaksi.delete({
        where: { id }
      });

      if (oldKategori) {
        await recalcAktualAnggaran(tx, existing.periodeId, oldTanggal, oldKategori);
      }

      return result;
    });

    res.json({ success: true, message: "Jurnal transaksi berhasil dihapus", data: deleted });
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus jurnal transaksi" });
  }
});

// ==========================================
// DOKUMEN RESMI (LPA/SPTJ/BAPSD)
// ==========================================

// Helper function to get realisasi per category dana
async function getRealisasiPeriode(tx, periodeId, kategoriDana) {
  const aggAnggaran = await tx.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana },
    _sum: { rab: true }
  });

  const aggJurnal = await tx.jurnalTransaksi.aggregate({
    where: {
      periodeId,
      akunDanaBiaya: {
        tipe: "BIAYA",
        kategoriDana
      }
    },
    _sum: { nominal: true }
  });

  const diajukan = aggAnggaran._sum.rab ? parseFloat(aggAnggaran._sum.rab) : 0;
  const terealisasi = aggJurnal._sum.nominal ? parseFloat(aggJurnal._sum.nominal) : 0;
  const sisa = Math.round((diajukan - terealisasi) * 100) / 100;

  return {
    diajukan: Math.round(diajukan * 100) / 100,
    terealisasi: Math.round(terealisasi * 100) / 100,
    sisa
  };
}

// Generate LPA
async function generateLPA(tx, periodeId, nomorDokumen) {
  const periode = await tx.periode.findUnique({ where: { id: periodeId } });
  if (!periode) {
    throw new Error("[NOT_FOUND] Periode tidak ditemukan");
  }

  const lembaga = await tx.setupLembaga.findUnique({ where: { periodeId } });
  if (!lembaga) {
    throw new Error("[VALIDASI] Pengaturan/setup lembaga untuk periode ini belum diisi");
  }

  const LABEL_KATEGORI = {
    BAHAN_MAKANAN: "Bahan Baku",
    OPERASIONAL: "Operasional",
    INSENTIF_FASILITAS: "Sewa"
  };

  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"];
  const rincian = await Promise.all(
    kategoris.map(async (k) => {
      const real = await getRealisasiPeriode(tx, periodeId, k);
      return {
        label: LABEL_KATEGORI[k],
        ...real
      };
    })
  );

  const total = rincian.reduce(
    (acc, r) => ({
      diajukan: Math.round((acc.diajukan + r.diajukan) * 100) / 100,
      terealisasi: Math.round((acc.terealisasi + r.terealisasi) * 100) / 100,
      sisa: Math.round((acc.sisa + r.sisa) * 100) / 100
    }),
    { diajukan: 0, terealisasi: 0, sisa: 0 }
  );

  return {
    nomorDokumen: nomorDokumen || null,
    periodeLabel: `${new Date(periode.tanggalMulai).toLocaleDateString("id-ID")} - ${new Date(periode.tanggalSelesai).toLocaleDateString("id-ID")}`,
    namaPejabat: lembaga.namaKepalaSPPG,
    jabatan: "Kepala Satuan Pelayanan Pemenuhan Gizi/Ketua Yayasan",
    namaLembaga: lembaga.namaLembaga,
    rincian,
    total,
    nomorRekeningVA: lembaga.nomorRekeningVA,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan ? new Date(lembaga.tanggalPelaporan).toLocaleDateString("id-ID") : null,
    namaYayasan: lembaga.namaYayasan,
    ketuaYayasan: lembaga.ketuaYayasan,
    namaAkuntan: lembaga.namaAkuntanSPPG
  };
}

// Generate SPTJ
async function generateSPTJ(tx, periodeId) {
  const lembaga = await tx.setupLembaga.findUnique({ where: { periodeId } });
  if (!lembaga) {
    throw new Error("[VALIDASI] Pengaturan/setup lembaga untuk periode ini belum diisi");
  }

  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"];
  const semua = await Promise.all(kategoris.map((k) => getRealisasiPeriode(tx, periodeId, k)));

  const jumlahPenerimaan = semua.reduce((s, r) => s + r.diajukan, 0);
  const jumlahPengeluaran = semua.reduce((s, r) => s + r.terealisasi, 0);

  return {
    namaPejabat: lembaga.namaKepalaSPPG,
    jabatan: "Kepala SPPG " + (lembaga.namaLembaga || "").replace(/^SPPG\s*/i, ""),
    jumlahPenerimaan: Math.round(jumlahPenerimaan * 100) / 100,
    jumlahPengeluaran: Math.round(jumlahPengeluaran * 100) / 100,
    sisaDana: Math.round((jumlahPenerimaan - jumlahPengeluaran) * 100) / 100,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan ? new Date(lembaga.tanggalPelaporan).toLocaleDateString("id-ID") : null
  };
}

// Generate BAPSD
async function generateBAPSD(tx, periodeId, nomorDokumen) {
  const periode = await tx.periode.findUnique({ where: { id: periodeId } });
  if (!periode) {
    throw new Error("[NOT_FOUND] Periode tidak ditemukan");
  }

  const lembaga = await tx.setupLembaga.findUnique({ where: { periodeId } });
  if (!lembaga) {
    throw new Error("[VALIDASI] Pengaturan/setup lembaga untuk periode ini belum diisi");
  }

  const sptj = await generateSPTJ(tx, periodeId);

  return {
    nomorDokumen: nomorDokumen || null,
    periodeLabel: `${new Date(periode.tanggalMulai).toLocaleDateString("id-ID")} - ${new Date(periode.tanggalSelesai).toLocaleDateString("id-ID")}`,
    sisaDana: sptj.sisaDana,
    tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? new Date(lembaga.awalPeriodeBerikutnya).toLocaleDateString("id-ID") : null,
    namaYayasan: lembaga.namaYayasan,
    ketuaYayasan: lembaga.ketuaYayasan,
    namaAkuntan: lembaga.namaAkuntanSPPG,
    namaPejabat: lembaga.namaKepalaSPPG,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan ? new Date(lembaga.tanggalPelaporan).toLocaleDateString("id-ID") : null
  };
}

// GET /api/akuntan/dokumen-resmi/generate - Generate preview data for a document
router.get("/dokumen-resmi/generate", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, jenisDokumen, nomorDokumen } = req.query;

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!jenisDokumen || (jenisDokumen !== "LPA" && jenisDokumen !== "SPTJ" && jenisDokumen !== "BAPSD")) {
      return res.status(400).json({ error: "jenisDokumen tidak valid (LPA, SPTJ, atau BAPSD)" });
    }

    let data;
    if (jenisDokumen === "LPA") {
      data = await generateLPA(prisma, periodeId, nomorDokumen);
    } else if (jenisDokumen === "SPTJ") {
      data = await generateSPTJ(prisma, periodeId);
    } else {
      data = await generateBAPSD(prisma, periodeId, nomorDokumen);
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat men-generate dokumen resmi" });
  }
});

// GET /api/akuntan/dokumen-resmi - List published DokumenResmi
router.get("/dokumen-resmi", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.dokumenResmi.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        createdBy: {
          select: { id: true, nama: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar dokumen resmi" });
  }
});

// POST /api/akuntan/dokumen-resmi - Publish a DokumenResmi
router.post("/dokumen-resmi", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, jenisDokumen, nomorDokumen } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!jenisDokumen || (jenisDokumen !== "LPA" && jenisDokumen !== "SPTJ" && jenisDokumen !== "BAPSD")) {
      return res.status(400).json({ error: "jenisDokumen tidak valid (LPA, SPTJ, atau BAPSD)" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Validate period exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // Check unique constraint [periodeId, jenisDokumen]
      const exists = await tx.dokumenResmi.findUnique({
        where: {
          periodeId_jenisDokumen: {
            periodeId,
            jenisDokumen
          }
        }
      });
      if (exists) {
        throw new Error("[CONFLICT] Dokumen resmi jenis ini sudah diterbitkan untuk periode terpilih");
      }

      return await tx.dokumenResmi.create({
        data: {
          periodeId,
          jenisDokumen,
          nomorDokumen: nomorDokumen || null,
          createdById: req.user.sub
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Dokumen resmi jenis ini sudah diterbitkan untuk periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menerbitkan dokumen resmi" });
  }
});

// DELETE /api/akuntan/dokumen-resmi/:id - Delete (unpublish) a DokumenResmi
router.delete("/dokumen-resmi/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.dokumenResmi.delete({
      where: { id }
    });
    res.json({ success: true, message: "Dokumen resmi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Dokumen resmi tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus dokumen resmi" });
  }
});

// ==========================================
// DAFTAR NOMINATIF UPAH
// ==========================================

// POST /api/akuntan/daftar-nominatif-upah - Create DaftarNominatifUpah with nested detailHarian
router.post("/daftar-nominatif-upah", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const {
      periodeId,
      jenisPekerjaan,
      namaRelawan,
      danaKesehatan,
      tk,
      pj,
      detailHarian
    } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!jenisPekerjaan) {
      return res.status(400).json({ error: "jenisPekerjaan wajib diisi" });
    }
    if (!namaRelawan) {
      return res.status(400).json({ error: "namaRelawan wajib diisi" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1. Validate period exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);

      // 2. Validate detailHarian if provided
      let normalizedDetails = [];
      if (Array.isArray(detailHarian) && detailHarian.length > 0) {
        const uniqueDates = new Set();
        for (const detail of detailHarian) {
          const { tanggal, nominal } = detail;
          if (!tanggal) {
            throw new Error("[VALIDASI] Setiap detail harian wajib memiliki tanggal");
          }
          
          const targetTanggal = normalizeDateUTC(tanggal);
          if (isNaN(targetTanggal.getTime())) {
            throw new Error("[VALIDASI] Format tanggal detail harian tidak valid");
          }

          if (targetTanggal < start || targetTanggal > end) {
            throw new Error("[VALIDASI] Tanggal detail harian harus berada di dalam batas rentang periode");
          }

          const parsedNominal = parseFloat(nominal);
          if (isNaN(parsedNominal) || parsedNominal <= 0) {
            throw new Error("[VALIDASI] Nominal detail harian harus berupa angka positif");
          }

          const dateStr = targetTanggal.toISOString().split("T")[0];
          if (uniqueDates.has(dateStr)) {
            throw new Error(`[VALIDASI] Duplikasi tanggal ${dateStr} pada detail harian`);
          }
          uniqueDates.add(dateStr);

          normalizedDetails.push({
            tanggal: targetTanggal,
            nominal: Math.round(parsedNominal * 100) / 100
          });
        }
      }

      // 3. Parse optional flat benefits
      const parsedDanaKesehatan = danaKesehatan !== undefined ? parseFloat(danaKesehatan) : null;
      if (parsedDanaKesehatan !== null && (isNaN(parsedDanaKesehatan) || parsedDanaKesehatan < 0)) {
        throw new Error("[VALIDASI] danaKesehatan tidak boleh negatif");
      }

      const parsedTk = tk !== undefined ? parseFloat(tk) : null;
      if (parsedTk !== null && (isNaN(parsedTk) || parsedTk < 0)) {
        throw new Error("[VALIDASI] tk tidak boleh negatif");
      }

      const parsedPj = pj !== undefined ? parseFloat(pj) : null;
      if (parsedPj !== null && (isNaN(parsedPj) || parsedPj < 0)) {
        throw new Error("[VALIDASI] pj tidak boleh negatif");
      }

      // 4. Create record
      return await tx.daftarNominatifUpah.create({
        data: {
          periodeId,
          jenisPekerjaan,
          namaRelawan,
          danaKesehatan: parsedDanaKesehatan !== null ? Math.round(parsedDanaKesehatan * 100) / 100 : null,
          tk: parsedTk !== null ? Math.round(parsedTk * 100) / 100 : null,
          pj: parsedPj !== null ? Math.round(parsedPj * 100) / 100 : null,
          detailHarian: {
            createMany: {
              data: normalizedDetails
            }
          }
        },
        include: {
          detailHarian: true
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan daftar nominatif upah" });
  }
});

// GET /api/akuntan/daftar-nominatif-upah - List DaftarNominatifUpah
router.get("/daftar-nominatif-upah", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.daftarNominatifUpah.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        detailHarian: true
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = data.map(item => {
      const totalHonorarium = item.detailHarian.reduce((sum, h) => sum + parseFloat(h.nominal), 0);
      const totalUpah = totalHonorarium + 
        (item.danaKesehatan ? parseFloat(item.danaKesehatan) : 0) + 
        (item.tk ? parseFloat(item.tk) : 0) + 
        (item.pj ? parseFloat(item.pj) : 0);

      return {
        ...item,
        totalHonorarium: Math.round(totalHonorarium * 100) / 100,
        totalUpah: Math.round(totalUpah * 100) / 100
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar nominatif upah" });
  }
});

// GET /api/akuntan/daftar-nominatif-upah/:id - Detail of DaftarNominatifUpah
router.get("/daftar-nominatif-upah/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.daftarNominatifUpah.findUnique({
      where: { id },
      include: {
        detailHarian: {
          orderBy: { tanggal: "asc" }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: "Daftar nominatif upah tidak ditemukan" });
    }

    const totalHonorarium = item.detailHarian.reduce((sum, h) => sum + parseFloat(h.nominal), 0);
    const totalUpah = totalHonorarium + 
      (item.danaKesehatan ? parseFloat(item.danaKesehatan) : 0) + 
      (item.tk ? parseFloat(item.tk) : 0) + 
      (item.pj ? parseFloat(item.pj) : 0);

    res.json({
      ...item,
      totalHonorarium: Math.round(totalHonorarium * 100) / 100,
      totalUpah: Math.round(totalUpah * 100) / 100
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail nominatif upah" });
  }
});

// PUT /api/akuntan/daftar-nominatif-upah/:id - Update DaftarNominatifUpah and its nested detailHarian
router.put("/daftar-nominatif-upah/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      jenisPekerjaan,
      namaRelawan,
      danaKesehatan,
      tk,
      pj,
      detailHarian
    } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.daftarNominatifUpah.findUnique({
        where: { id }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Daftar nominatif upah tidak ditemukan");
      }

      const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);

      const targetJenisPekerjaan = jenisPekerjaan !== undefined ? jenisPekerjaan : existing.jenisPekerjaan;
      if (!targetJenisPekerjaan) {
        throw new Error("[VALIDASI] jenisPekerjaan tidak boleh kosong");
      }

      const targetNamaRelawan = namaRelawan !== undefined ? namaRelawan : existing.namaRelawan;
      if (!targetNamaRelawan) {
        throw new Error("[VALIDASI] namaRelawan tidak boleh kosong");
      }

      const targetDanaKesehatan = danaKesehatan !== undefined ? (danaKesehatan !== null ? parseFloat(danaKesehatan) : null) : (existing.danaKesehatan !== null ? parseFloat(existing.danaKesehatan) : null);
      if (targetDanaKesehatan !== null && (isNaN(targetDanaKesehatan) || targetDanaKesehatan < 0)) {
        throw new Error("[VALIDASI] danaKesehatan tidak boleh negatif");
      }

      const targetTk = tk !== undefined ? (tk !== null ? parseFloat(tk) : null) : (existing.tk !== null ? parseFloat(existing.tk) : null);
      if (targetTk !== null && (isNaN(targetTk) || targetTk < 0)) {
        throw new Error("[VALIDASI] tk tidak boleh negatif");
      }

      const targetPj = pj !== undefined ? (pj !== null ? parseFloat(pj) : null) : (existing.pj !== null ? parseFloat(existing.pj) : null);
      if (targetPj !== null && (isNaN(targetPj) || targetPj < 0)) {
        throw new Error("[VALIDASI] pj tidak boleh negatif");
      }

      let normalizedDetails = null;
      if (detailHarian !== undefined) {
        if (Array.isArray(detailHarian)) {
          normalizedDetails = [];
          const uniqueDates = new Set();
          for (const detail of detailHarian) {
            const { tanggal, nominal } = detail;
            if (!tanggal) {
              throw new Error("[VALIDASI] Setiap detail harian wajib memiliki tanggal");
            }
            
            const targetTanggal = normalizeDateUTC(tanggal);
            if (isNaN(targetTanggal.getTime())) {
              throw new Error("[VALIDASI] Format tanggal detail harian tidak valid");
            }

            if (targetTanggal < start || targetTanggal > end) {
              throw new Error("[VALIDASI] Tanggal detail harian harus berada di dalam batas rentang periode");
            }

            const parsedNominal = parseFloat(nominal);
            if (isNaN(parsedNominal) || parsedNominal <= 0) {
              throw new Error("[VALIDASI] Nominal detail harian harus berupa angka positif");
            }

            const dateStr = targetTanggal.toISOString().split("T")[0];
            if (uniqueDates.has(dateStr)) {
              throw new Error(`[VALIDASI] Duplikasi tanggal ${dateStr} pada detail harian`);
            }
            uniqueDates.add(dateStr);

            normalizedDetails.push({
              daftarNominatifId: id,
              tanggal: targetTanggal,
              nominal: Math.round(parsedNominal * 100) / 100
            });
          }
        } else {
          throw new Error("[VALIDASI] detailHarian harus berupa array");
        }
      }

      // Update parent
      await tx.daftarNominatifUpah.update({
        where: { id },
        data: {
          jenisPekerjaan: targetJenisPekerjaan,
          namaRelawan: targetNamaRelawan,
          danaKesehatan: targetDanaKesehatan !== null ? Math.round(targetDanaKesehatan * 100) / 100 : null,
          tk: targetTk !== null ? Math.round(targetTk * 100) / 100 : null,
          pj: targetPj !== null ? Math.round(targetPj * 100) / 100 : null
        }
      });

      // Update nested detailHarian (using deleteMany + createMany) if provided
      if (normalizedDetails !== null) {
        await tx.daftarNominatifUpahHarian.deleteMany({
          where: { daftarNominatifId: id }
        });
        if (normalizedDetails.length > 0) {
          await tx.daftarNominatifUpahHarian.createMany({
            data: normalizedDetails
          });
        }
      }

      return await tx.daftarNominatifUpah.findUnique({
        where: { id },
        include: { detailHarian: true }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui daftar nominatif upah" });
  }
});

// DELETE /api/akuntan/daftar-nominatif-upah/:id - Delete DaftarNominatifUpah (Cascade)
router.delete("/daftar-nominatif-upah/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.daftarNominatifUpah.delete({
      where: { id }
    });
    res.json({ success: true, message: "Daftar nominatif upah berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Daftar nominatif upah tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus daftar nominatif upah" });
  }
});

// ==========================================
// STOK: SALDO AWAL BARANG
// ==========================================

// POST /api/akuntan/saldo-awal-barang - Create SaldoAwalBarang
router.post("/saldo-awal-barang", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, bahanPokokId, saldoAwalQty, hargaBeliAwal } = req.body || {};

    if (!periodeId) return res.status(400).json({ error: "periodeId wajib diisi" });
    if (!bahanPokokId) return res.status(400).json({ error: "bahanPokokId wajib diisi" });
    if (saldoAwalQty === undefined) return res.status(400).json({ error: "saldoAwalQty wajib diisi" });
    if (hargaBeliAwal === undefined) return res.status(400).json({ error: "hargaBeliAwal wajib diisi" });

    const qty = parseFloat(saldoAwalQty);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: "saldoAwalQty harus berupa angka non-negatif" });
    }

    const harga = parseFloat(hargaBeliAwal);
    if (isNaN(harga) || harga < 0) {
      return res.status(400).json({ error: "hargaBeliAwal harus berupa angka non-negatif" });
    }

    const bahanPokok = await prisma.bahanPokok.findUnique({ where: { id: bahanPokokId } });
    if (!bahanPokok) {
      return res.status(404).json({ error: "Bahan Pokok tidak ditemukan" });
    }
    if (!bahanPokok.aktif) {
      return res.status(400).json({ error: "Bahan Pokok tidak aktif" });
    }

    const created = await prisma.saldoAwalBarang.create({
      data: {
        periodeId,
        bahanPokokId,
        saldoAwalQty: Math.round(qty * 1000) / 1000,
        hargaBeliAwal: Math.round(harga * 100) / 100
      },
      include: {
        bahanPokok: true
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Saldo awal untuk bahan pokok ini di periode yang sama sudah ada" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Periode atau Bahan Pokok tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan saldo awal barang" });
  }
});

// GET /api/akuntan/saldo-awal-barang - List SaldoAwalBarang for a period
router.get("/saldo-awal-barang", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    const data = await prisma.saldoAwalBarang.findMany({
      where: { periodeId },
      include: { bahanPokok: true }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil saldo awal barang" });
  }
});

// POST /api/akuntan/mutasi-stok - Create MutasiStok
router.post("/mutasi-stok", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const {
      bahanPokokId,
      tanggal,
      jenis,
      qty,
      keterangan,
      supplierId,
      hargaBeli,
      kelompokPenerima
    } = req.body || {};

    if (!bahanPokokId) return res.status(400).json({ error: "bahanPokokId wajib diisi" });
    if (!tanggal) return res.status(400).json({ error: "tanggal wajib diisi" });
    if (!jenis) return res.status(400).json({ error: "jenis wajib diisi" });
    if (qty === undefined) return res.status(400).json({ error: "qty wajib diisi" });

    if (jenis !== "MASUK" && jenis !== "KELUAR") {
      return res.status(400).json({ error: "jenis harus MASUK atau KELUAR" });
    }

    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: "qty harus berupa angka positif" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    const bahanPokok = await prisma.bahanPokok.findUnique({ where: { id: bahanPokokId } });
    if (!bahanPokok) {
      return res.status(404).json({ error: "Bahan Pokok tidak ditemukan" });
    }
    if (!bahanPokok.aktif) {
      return res.status(400).json({ error: "Bahan Pokok tidak aktif" });
    }

    let targetSupplierId = null;
    let targetHargaBeli = null;
    let targetKelompokPenerima = null;

    if (jenis === "MASUK") {
      if (!supplierId) return res.status(400).json({ error: "supplierId wajib diisi untuk mutasi MASUK" });
      if (hargaBeli === undefined || hargaBeli === null) return res.status(400).json({ error: "hargaBeli wajib diisi untuk mutasi MASUK" });
      
      const parsedHarga = parseFloat(hargaBeli);
      if (isNaN(parsedHarga) || parsedHarga < 0) {
        return res.status(400).json({ error: "hargaBeli harus berupa angka non-negatif" });
      }

      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
         return res.status(404).json({ error: "Supplier tidak ditemukan" });
      }
      if (!supplier.aktif) {
        return res.status(400).json({ error: "Supplier tidak aktif" });
      }

      targetSupplierId = supplierId;
      targetHargaBeli = Math.round(parsedHarga * 100) / 100;
      
      if (kelompokPenerima) {
        return res.status(400).json({ error: "kelompokPenerima tidak boleh diisi untuk mutasi MASUK" });
      }
    } else if (jenis === "KELUAR") {
      if (!kelompokPenerima) {
        return res.status(400).json({ error: "kelompokPenerima wajib diisi untuk mutasi KELUAR" });
      }
      if (kelompokPenerima !== "SISWA" && kelompokPenerima !== "B3") {
        return res.status(400).json({ error: "kelompokPenerima harus SISWA atau B3" });
      }
      if (supplierId != null || hargaBeli != null) {
        return res.status(400).json({ error: "supplierId dan hargaBeli harus null atau tidak diisi untuk mutasi KELUAR" });
      }
      
      targetKelompokPenerima = kelompokPenerima;

      // [ASUMSI] Saldo tidak divalidasi (bisa minus), sistem hanya melakukan pencatatan mutasi.
    }

    const created = await prisma.mutasiStok.create({
      data: {
        bahanPokokId,
        tanggal: targetTanggal,
        jenis,
        qty: Math.round(parsedQty * 1000) / 1000,
        keterangan: keterangan || null,
        supplierId: targetSupplierId,
        hargaBeli: targetHargaBeli,
        kelompokPenerima: targetKelompokPenerima,
        createdById: req.user.sub
      },
      include: {
        bahanPokok: true,
        supplier: true
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan mutasi stok" });
  }
});

// GET /api/akuntan/mutasi-stok - List MutasiStok
router.get("/mutasi-stok", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    
    let whereClause = {};
    if (periodeId) {
      const period = await prisma.periode.findUnique({ where: { id: periodeId } });
      if (period) {
        whereClause.tanggal = {
          gte: period.tanggalMulai,
          lte: period.tanggalSelesai
        };
      }
    }

    const list = await prisma.mutasiStok.findMany({
      where: whereClause,
      include: {
        bahanPokok: true,
        supplier: true
      },
      orderBy: {
        tanggal: "desc"
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data mutasi stok" });
  }
});

// ==========================================
// VALIDASI STOK (Akuntan-only)
// ==========================================

// POST /api/akuntan/validasi-stok - Simpan validasi fisik baru
router.post("/validasi-stok", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { bahanPokokId, tanggal, qtyDibeli, qtyTerpakai, catatan } = req.body || {};

    if (!bahanPokokId) {
      return res.status(400).json({ error: "bahanPokokId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }
    if (qtyDibeli === undefined || qtyDibeli === null) {
      return res.status(400).json({ error: "qtyDibeli wajib diisi" });
    }
    if (qtyTerpakai === undefined || qtyTerpakai === null) {
      return res.status(400).json({ error: "qtyTerpakai wajib diisi" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // Pastikan bahanPokok ada di database
    const bahan = await prisma.bahanPokok.findUnique({ where: { id: bahanPokokId } });
    if (!bahan) {
      return res.status(404).json({ error: "Bahan pokok tidak ditemukan" });
    }

    // Hitung selisih server-side (derived value): selisih = qtyDibeli - qtyTerpakai
    const selisih = Number(qtyDibeli) - Number(qtyTerpakai);

    const created = await prisma.validasiStok.create({
      data: {
        bahanPokokId,
        tanggal: targetTanggal,
        qtyDibeli: Number(qtyDibeli),
        qtyTerpakai: Number(qtyTerpakai),
        selisih: selisih,
        catatan: catatan ? String(catatan).trim() : null,
        validatedById: req.user.sub
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Validasi stok untuk bahan pokok pada tanggal ini sudah tercatat" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data validasi stok" });
  }
});

// GET /api/akuntan/validasi-stok - Riwayat validasi stok
router.get("/validasi-stok", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { bahanPokokId, tanggal, limit, offset } = req.query;

    let take = limit ? parseInt(limit, 10) : 10;
    const skip = offset ? parseInt(offset, 10) : 0;
    if (isNaN(take) || take < 0 || isNaN(skip) || skip < 0) {
      return res.status(400).json({ error: "Parameter limit dan offset harus berupa angka non-negatif" });
    }
    take = Math.min(take, 100);

    const where = {};
    if (bahanPokokId) {
      where.bahanPokokId = bahanPokokId;
    }
    if (tanggal) {
      const targetTanggal = normalizeDateUTC(tanggal);
      if (isNaN(targetTanggal.getTime())) {
        return res.status(400).json({ error: "Format tanggal tidak valid" });
      }
      where.tanggal = targetTanggal;
    }

    const [list, total] = await Promise.all([
      prisma.validasiStok.findMany({
        where,
        take,
        skip,
        orderBy: { tanggal: "desc" },
        include: {
          bahanPokok: {
            select: {
              id: true,
              nama: true
            }
          },
          validatedBy: {
            select: {
              id: true,
              nama: true,
              username: true
            }
          }
        }
      }),
      prisma.validasiStok.count({ where })
    ]);

    res.json({
      data: list,
      pagination: {
        total,
        limit: take,
        offset: skip
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data validasi stok" });
  }
});

// GET /api/akuntan/validasi-stok/preview - Preview akumulasi MutasiStok s.d. tanggal terpilih
router.get("/validasi-stok/preview", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { bahanPokokId, tanggal } = req.query;

    if (!bahanPokokId) {
      return res.status(400).json({ error: "bahanPokokId wajib disertakan pada query parameter" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib disertakan pada query parameter" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // Aggregation logic: sum qty dari MutasiStok lte targetTanggal
    const aggregations = await prisma.mutasiStok.groupBy({
      by: ["jenis"],
      where: {
        bahanPokokId,
        tanggal: {
          lte: targetTanggal
        }
      },
      _sum: {
        qty: true
      }
    });

    let qtyDibeli = 0;
    let qtyTerpakai = 0;

    for (const agg of aggregations) {
      if (agg.jenis === "MASUK") {
        qtyDibeli = agg._sum.qty ? Number(agg._sum.qty) : 0;
      } else if (agg.jenis === "KELUAR") {
        qtyTerpakai = agg._sum.qty ? Number(agg._sum.qty) : 0;
      }
    }

    const sisaSistem = qtyDibeli - qtyTerpakai;

    res.json({
      bahanPokokId,
      tanggal: targetTanggal.toISOString().split("T")[0],
      qtyDibeli,
      qtyTerpakai,
      sisaSistem
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses preview validasi stok" });
  }
});

// GET /api/akuntan/akun - List all active accounts
router.get("/akun", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const list = await prisma.akun.findMany({
      where: {
        aktif: true
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        tipe: true,
        kategoriDana: true
      },
      orderBy: {
        kode: "asc"
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data akun" });
  }
});


// GET /api/akuntan/supplier - List all active suppliers
router.get("/supplier", requireAuth, requireRole("AKUNTAN", "MITRA"), async (req, res) => {
  try {
    const list = await prisma.supplier.findMany({
      where: {
        aktif: true
      },
      select: {
        id: true,
        nama: true,
        kontak: true
      },
      orderBy: {
        nama: "asc"
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data supplier" });
  }
});

// GET /api/akuntan/periode/latest-setup - Mendapatkan SetupLembaga periode terakhir untuk autofill
router.get("/periode/latest-setup", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const latest = await prisma.periode.findFirst({
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });
    
    if (latest) {
      // Ubah date object ke string date-only YYYY-MM-DD
      const formatted = {
        ...latest,
        tanggalMulai: latest.tanggalMulai.toISOString().split("T")[0],
        tanggalSelesai: latest.tanggalSelesai.toISOString().split("T")[0],
        setupLembaga: latest.setupLembaga ? {
          ...latest.setupLembaga,
          awalPeriodeBerikutnya: latest.setupLembaga.awalPeriodeBerikutnya.toISOString().split("T")[0],
          tanggalPelaporan: latest.setupLembaga.tanggalPelaporan.toISOString().split("T")[0]
        } : null
      };
      return res.json({ success: true, data: formatted });
    }
    
    res.json({ success: true, data: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data periode terakhir" });
  }
});

// POST /api/akuntan/periode - Membuat periode baru beserta SetupLembaga
router.post("/periode", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const {
      tanggalMulai,
      tanggalSelesai,
      anggaranAlokasi,
      totalDanaDiterima,
      namaLembaga,
      alamat,
      namaKepalaSPPG,
      namaAkuntanSPPG,
      namaYayasan,
      ketuaYayasan,
      nomorRekeningVA,
      tahunAnggaran,
      awalPeriodeBerikutnya,
      tanggalPelaporan,
      tempatPelaporan
    } = req.body;

    // Validasi field wajib
    if (!tanggalMulai || !tanggalSelesai || !anggaranAlokasi ||
        !namaLembaga || !alamat || !namaKepalaSPPG || !namaAkuntanSPPG ||
        !namaYayasan || !ketuaYayasan || !nomorRekeningVA || !tahunAnggaran ||
        !awalPeriodeBerikutnya || !tanggalPelaporan || !tempatPelaporan) {
      return res.status(400).json({ error: "Seluruh field wajib harus diisi" });
    }

    const start = normalizeDateUTC(tanggalMulai);
    const end = normalizeDateUTC(tanggalSelesai);
    const nextStart = normalizeDateUTC(awalPeriodeBerikutnya);
    const reportDate = normalizeDateUTC(tanggalPelaporan);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(nextStart.getTime()) || isNaN(reportDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    if (start >= end) {
      return res.status(400).json({ error: "Tanggal mulai harus sebelum tanggal selesai" });
    }

    // Cek irisan periode
    const overlap = await prisma.periode.findFirst({
      where: {
        OR: [
          { tanggalMulai: { lte: end }, tanggalSelesai: { gte: start } }
        ]
      }
    });

    if (overlap) {
      return res.status(400).json({ error: "Rentang tanggal tumpang tindih dengan periode yang sudah ada" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPeriode = await tx.periode.create({
        data: {
          tanggalMulai: start,
          tanggalSelesai: end,
          anggaranAlokasi: parseFloat(anggaranAlokasi),
          totalDanaDiterima: totalDanaDiterima ? parseFloat(totalDanaDiterima) : null,
          setupLembaga: {
            create: {
              namaLembaga,
              alamat,
              namaKepalaSPPG,
              namaAkuntanSPPG,
              namaYayasan,
              ketuaYayasan,
              nomorRekeningVA,
              tahunAnggaran: parseInt(tahunAnggaran, 10),
              awalPeriodeBerikutnya: nextStart,
              tanggalPelaporan: reportDate,
              tempatPelaporan
            }
          }
        },
        include: { setupLembaga: true }
      });
      return newPeriode;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat periode baru" });
  }
});

module.exports = router;
