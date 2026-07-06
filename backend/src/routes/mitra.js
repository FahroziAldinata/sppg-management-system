const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// CRUD BAHAN POKOK (READ-ONLY FOR MITRA & OTHERS)
// ==========================================

// GET /api/mitra/bahan-pokok - List all master food ingredients
router.get("/bahan-pokok", requireAuth, requireRole("MITRA", "ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.bahanPokok.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data bahan pokok" });
  }
});

// ==========================================
// CRUD HARGA BAHAN PERIODE
// ==========================================

// GET /api/mitra/harga-bahan - Get list of ingredient prices per period
// Catatan keputusan desain: periodeId wajib di query param karena data harga bahan
// per periode bisa sangat banyak, membatasi load DB untuk skala performa.
router.get("/harga-bahan", requireAuth, requireRole("MITRA", "ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const data = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId },
      include: {
        bahanPokok: true,
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        }
      },
      orderBy: {
        bahanPokok: { nama: "asc" }
      }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data harga bahan" });
  }
});

// GET /api/mitra/harga-bahan/:id - Get single ingredient price entry
router.get("/harga-bahan/:id", requireAuth, requireRole("MITRA", "ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.hargaBahanPeriode.findUnique({
      where: { id },
      include: {
        bahanPokok: true,
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data harga bahan pokok tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data harga bahan" });
  }
});

// POST /api/mitra/harga-bahan - Create new ingredient price for a period
router.post("/harga-bahan", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { periodeId, bahanPokokId, harga, isFallback } = req.body || {};

    // 1. Basic validation
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!bahanPokokId) {
      return res.status(400).json({ error: "bahanPokokId wajib diisi" });
    }
    const numHarga = parseFloat(harga);
    if (isNaN(numHarga) || numHarga < 0) {
      return res.status(400).json({ error: "harga harus berupa angka non-negatif" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 2. Validate period exists
      const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!periodExists) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 3. Validate food ingredient exists
      const ingredientExists = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
      if (!ingredientExists) {
        throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
      }

      // 4. Validate unique constraint: [periodeId, bahanPokokId]
      const existing = await tx.hargaBahanPeriode.findUnique({
        where: {
          periodeId_bahanPokokId: {
            periodeId,
            bahanPokokId
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Harga bahan pokok untuk periode ini sudah terdaftar");
      }

      // 5. Create in database
      return await tx.hargaBahanPeriode.create({
        data: {
          periodeId,
          bahanPokokId,
          harga: numHarga,
          isFallback: !!isFallback,
          createdById: req.user.sub
        },
        include: {
          bahanPokok: true
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Harga bahan pokok untuk periode ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan harga bahan" });
  }
});

// PUT /api/mitra/harga-bahan/:id - Update existing ingredient price for a period
router.put("/harga-bahan/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodeId, bahanPokokId, harga, isFallback } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Check exists
      const existingRecord = await tx.hargaBahanPeriode.findUnique({
        where: { id }
      });
      if (!existingRecord) {
        throw new Error("[NOT_FOUND] Data harga bahan pokok tidak ditemukan");
      }

      // Determine target values
      const targetPeriodeId = periodeId || existingRecord.periodeId;
      const targetBahanPokokId = bahanPokokId || existingRecord.bahanPokokId;
      const targetHarga = harga !== undefined ? parseFloat(harga) : parseFloat(existingRecord.harga);
      const targetIsFallback = isFallback !== undefined ? !!isFallback : existingRecord.isFallback;

      if (isNaN(targetHarga) || targetHarga < 0) {
        throw new Error("[VALIDASI] harga harus berupa angka non-negatif");
      }

      // Validate target period
      if (periodeId && periodeId !== existingRecord.periodeId) {
        const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
        if (!periodExists) {
          throw new Error("[NOT_FOUND] Periode tidak ditemukan");
        }
      }

      // Validate target food ingredient
      if (bahanPokokId && bahanPokokId !== existingRecord.bahanPokokId) {
        const ingredientExists = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
        if (!ingredientExists) {
          throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
        }
      }

      // Check unique constraint excluding this record itself
      const conflict = await tx.hargaBahanPeriode.findFirst({
        where: {
          periodeId: targetPeriodeId,
          bahanPokokId: targetBahanPokokId,
          NOT: { id }
        }
      });
      if (conflict) {
        throw new Error("[CONFLICT] Harga bahan pokok untuk periode ini sudah terdaftar");
      }

      // Update
      return await tx.hargaBahanPeriode.update({
        where: { id },
        data: {
          periodeId: targetPeriodeId,
          bahanPokokId: targetBahanPokokId,
          harga: targetHarga,
          isFallback: targetIsFallback
        },
        include: {
          bahanPokok: true
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Harga bahan pokok untuk periode ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui harga bahan" });
  }
});

// DELETE /api/mitra/harga-bahan/:id - Delete existing ingredient price entry
router.delete("/harga-bahan/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.hargaBahanPeriode.findUnique({
      where: { id }
    });
    if (!exists) {
      return res.status(404).json({ error: "Data harga bahan pokok tidak ditemukan" });
    }

    await prisma.hargaBahanPeriode.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data harga bahan pokok berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data harga bahan pokok tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus harga bahan" });
  }
});

// Helper to normalize date
function normalizeDateUTC(input) {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const HARI_MAP = {
  1: "SENIN",
  2: "SELASA",
  3: "RABU",
  4: "KAMIS",
  5: "JUMAT",
  6: "SABTU"
};

// GET /api/mitra/po/kebutuhan - Get ingredient requirements for a specific date
router.get("/po/kebutuhan", requireAuth, requireRole("MITRA", "AKUNTAN"), async (req, res) => {
  try {
    const { tanggal, periodeId } = req.query;
    if (!tanggal || !periodeId) {
      return res.status(400).json({ error: "tanggal dan periodeId wajib diisi" });
    }

    const targetDate = normalizeDateUTC(tanggal);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // 1. Fetch MenuHarian for this date & period
    const menu = await prisma.menuHarian.findFirst({
      where: {
        periodeId,
        tanggal: targetDate
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

    if (!menu) {
      return res.json({ success: true, menu: null, ingredients: [] });
    }

    // 2. Fetch active InputPenerimaManfaat once
    const day = targetDate.getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    let inputsForDay = [];
    if (dayOfWeek) {
      const activeInputs = await prisma.inputPenerimaManfaat.findMany({
        where: { periodeId },
        include: { detail: true }
      });
      inputsForDay = activeInputs.filter(inp => inp.hariAktif.includes(dayOfWeek));
    }

    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
      }
    }

    // Get active price list for this period
    const priceList = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId }
    });
    const priceMap = {};
    priceList.forEach(p => {
      priceMap[p.bahanPokokId] = Number(p.harga);
    });

    const akumulasiBahan = {};

    for (const blok of menu.blok) {
      // Calculate total portions for this block
      let totalPorsiBlok = 0;
      const categoriesInBlock = blok.kelompokUmurMenu.kategoriPenerima;
      for (const kat of categoriesInBlock) {
        totalPorsiBlok += (porsiPerKategori[kat.id] || 0);
      }

      for (const item of blok.menuItem) {
        for (const b of item.bahan) {
          const bid = b.bahanPokokId;
          if (!akumulasiBahan[bid]) {
            akumulasiBahan[bid] = {
              bahanPokokId: bid,
              nama: b.bahanPokok.nama,
              satuan: b.bahanPokok.satuan,
              qtySiswa: 0,
              qtyB3: 0,
              qtyTotal: 0,
              hargaSatuan: priceMap[bid] || 0
            };
          }

          // Kebutuhan bahan = porsi * beratKotorGr / 1000 (convert to kg/liter)
          const qtyNeed = (Number(b.beratKotorGr) * totalPorsiBlok) / 1000;
          
          if (blok.kelompokUmurMenu.jalur === "SISWA") {
            akumulasiBahan[bid].qtySiswa += qtyNeed;
          } else {
            akumulasiBahan[bid].qtyB3 += qtyNeed;
          }
          akumulasiBahan[bid].qtyTotal += qtyNeed;
        }
      }
    }

    // Convert to rounded values
    const result = Object.values(akumulasiBahan).map(b => ({
      ...b,
      qtySiswa: Math.round(b.qtySiswa * 1000) / 1000,
      qtyB3: Math.round(b.qtyB3 * 1000) / 1000,
      qtyTotal: Math.round(b.qtyTotal * 1000) / 1000,
      subtotal: Math.round((b.qtyTotal * b.hargaSatuan) * 100) / 100
    }));

    // Construct Menu description string for PO header
    const menuNames = [];
    menu.blok.forEach(b => {
      b.menuItem.forEach(item => {
        if (!menuNames.includes(item.nama)) {
          menuNames.push(item.nama);
        }
      });
    });

    res.json({
      success: true,
      menuDescription: menuNames.join(", "),
      ingredients: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses kebutuhan PO" });
  }
});

// POST /api/mitra/po - Create a new TransaksiPembelian (PO)
router.post("/po", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { periodeId, tanggal, supplierId, items, catatan } = req.body || {};

    if (!periodeId) return res.status(400).json({ error: "periodeId wajib diisi" });
    if (!tanggal) return res.status(400).json({ error: "tanggal wajib diisi" });
    if (!supplierId) return res.status(400).json({ error: "supplierId wajib diisi" });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items PO tidak boleh kosong" });
    }

    const targetDate = normalizeDateUTC(tanggal);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // 1. Get or create RabHarian for this date & period
    let rabHarian = await prisma.rabHarian.findUnique({
      where: {
        periodeId_tanggal: {
          periodeId,
          tanggal: targetDate
        }
      }
    });

    if (!rabHarian) {
      // Create RabHarian auto in DRAFT state
      rabHarian = await prisma.rabHarian.create({
        data: {
          periodeId,
          tanggal: targetDate,
          status: "DRAFT",
          createdById: req.user.id
        }
      });
    }

    // 2. Create the TransaksiPembelian under RabHarian inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const tp = await tx.transaksiPembelian.create({
        data: {
          rabHarianId: rabHarian.id,
          supplierId,
          tanggal: targetDate,
          catatan: catatan || null
        }
      });

      for (const item of items) {
        const qty = parseFloat(item.qtyTotal);
        const harga = parseFloat(item.hargaSatuan);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`[VALIDASI] Qty untuk bahan pokok ID ${item.bahanPokokId} tidak valid`);
        }
        if (isNaN(harga) || harga < 0) {
          throw new Error(`[VALIDASI] Harga untuk bahan pokok ID ${item.bahanPokokId} tidak valid`);
        }

        await tx.transaksiPembelianItem.create({
          data: {
            transaksiId: tp.id,
            bahanPokokId: item.bahanPokokId,
            qty: Math.round(qty * 1000) / 1000,
            hargaSatuan: Math.round(harga * 100) / 100,
            subtotal: Math.round((qty * harga) * 100) / 100
          }
        });
      }

      return await tx.transaksiPembelian.findUnique({
        where: { id: tp.id },
        include: {
          items: {
            include: { bahanPokok: true }
          },
          supplier: true
        }
      });
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.startsWith("[VALIDASI]")) {
      return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan PO" });
  }
});

// GET /api/mitra/po/list - List all TransaksiPembelian (POs) for a period
router.get("/po/list", requireAuth, requireRole("MITRA", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }

    const data = await prisma.transaksiPembelian.findMany({
      where: {
        rabHarian: { periodeId }
      },
      include: {
        supplier: true,
        rabHarian: true,
        items: {
          include: { bahanPokok: true }
        }
      },
      orderBy: {
        tanggal: "desc"
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil list PO" });
  }
});

module.exports = router;
