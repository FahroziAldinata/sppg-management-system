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

module.exports = router;
