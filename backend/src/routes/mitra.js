const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getTotalPorsiBlok } = require("../lib/porsiHelper");

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

// PUT /api/mitra/bahan-pokok/:id - Update master food ingredient conversion config
router.put("/bahan-pokok/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;
    const { konversiPerKg, satuanHitungan } = req.body;

    const data = await prisma.bahanPokok.update({
      where: { id },
      data: {
        konversiPerKg: konversiPerKg !== undefined && konversiPerKg !== null && konversiPerKg !== "" ? parseFloat(konversiPerKg) : null,
        satuanHitungan: satuanHitungan !== undefined && satuanHitungan !== null && satuanHitungan !== "" ? satuanHitungan.toUpperCase() : null
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data bahan pokok" });
  }
});

// ==========================================
// CRUD KENDARAAN (MITRA OWNS LOGISTICS VEHICLE SETUP)
// ==========================================

// GET /api/mitra/kendaraan - List Kendaraan
router.get("/kendaraan", requireAuth, requireRole("MITRA", "AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const list = await prisma.kendaraan.findMany({
      orderBy: [
        { aktif: "desc" },
        { namaKendaraan: "asc" }
      ]
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar kendaraan" });
  }
});

// GET /api/mitra/kendaraan/:id - Detail Kendaraan
router.get("/kendaraan/:id", requireAuth, requireRole("MITRA", "AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.kendaraan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail kendaraan" });
  }
});

// POST /api/mitra/kendaraan - Create Kendaraan
router.post("/kendaraan", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { namaKendaraan, platNomor, aktif } = req.body || {};
    if (!namaKendaraan) return res.status(400).json({ error: "namaKendaraan wajib diisi" });

    const created = await prisma.kendaraan.create({
      data: {
        namaKendaraan,
        platNomor,
        aktif: aktif !== undefined ? Boolean(aktif) : true
      }
    });
    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan kendaraan" });
  }
});

// PUT /api/mitra/kendaraan/:id - Update Kendaraan
router.put("/kendaraan/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;
    const { namaKendaraan, platNomor, aktif } = req.body || {};

    const existing = await prisma.kendaraan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });

    const updated = await prisma.kendaraan.update({
      where: { id },
      data: {
        namaKendaraan: namaKendaraan !== undefined ? namaKendaraan : undefined,
        platNomor: platNomor !== undefined ? platNomor : undefined,
        aktif: aktif !== undefined ? Boolean(aktif) : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui kendaraan" });
  }
});

// DELETE /api/mitra/kendaraan/:id - Delete Kendaraan
router.delete("/kendaraan/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.kendaraan.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });

    await prisma.kendaraan.delete({ where: { id } });
    res.json({ success: true, message: "Data kendaraan berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    if (error.code === "P2003" || error.message?.includes("23001") || error.message?.includes("foreign key constraint")) {
      return res.status(409).json({ error: "Kendaraan tidak dapat dihapus karena masih digunakan pada data pengiriman" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus kendaraan" });
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

    const tanggalArr = tanggal.split(',').map(t => t.trim()).filter(Boolean);
    if (tanggalArr.length === 0) {
      return res.status(400).json({ error: "tanggal tidak boleh kosong" });
    }

    // Get active price list for this period
    const priceList = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId }
    });
    const priceMap = {};
    priceList.forEach(p => {
      priceMap[p.bahanPokokId] = Number(p.harga);
    });

    // Fetch active InputPenerimaManfaat once
    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true }
    });

    const menuByTanggal = {};
    const akumulasiBahan = {};

    for (const tgl of tanggalArr) {
      const targetDate = normalizeDateUTC(tgl);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: `Format tanggal tidak valid: ${tgl}` });
      }

      // Fetch MenuHarian for this date & period
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
        menuByTanggal[tgl] = "";
        continue;
      }

      // Construct Menu description string for this date
      const menuNames = [];
      menu.blok.forEach(b => {
        b.menuItem.forEach(item => {
          if (!menuNames.includes(item.nama)) {
            menuNames.push(item.nama);
          }
        });
      });
      menuByTanggal[tgl] = menuNames.join(", ");

      const day = targetDate.getUTCDay();
      const dayOfWeek = HARI_MAP[day];
      let inputsForDay = [];
      if (dayOfWeek) {
        inputsForDay = activeInputs.filter(inp => inp.hariAktif.includes(dayOfWeek));
      }

      const porsiPerKategori = {};
      for (const input of inputsForDay) {
        for (const det of input.detail) {
          porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
        }
      }

      for (const blok of menu.blok) {
        // Calculate total portions for this block
        const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);

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
                hargaSatuan: priceMap[bid] || 0,
                perTanggal: {}
              };
            }

            if (!akumulasiBahan[bid].perTanggal[tgl]) {
              akumulasiBahan[bid].perTanggal[tgl] = { siswa: 0, b3: 0 };
            }

            // Kebutuhan bahan = porsi * beratKotorGr / 1000
            const qtyNeed = (Number(b.beratKotorGr) * totalPorsiBlok) / 1000;
            
            if (blok.kelompokUmurMenu.jalur === "SISWA") {
              akumulasiBahan[bid].qtySiswa += qtyNeed;
              akumulasiBahan[bid].perTanggal[tgl].siswa += qtyNeed;
            } else {
              akumulasiBahan[bid].qtyB3 += qtyNeed;
              akumulasiBahan[bid].perTanggal[tgl].b3 += qtyNeed;
            }
            akumulasiBahan[bid].qtyTotal += qtyNeed;
          }
        }
      }
    }

    // Convert to rounded values
    const result = Object.values(akumulasiBahan).map(b => {
      const roundedPerTanggal = {};
      for (const tgl of tanggalArr) {
        const pt = b.perTanggal[tgl] || { siswa: 0, b3: 0 };
        roundedPerTanggal[tgl] = {
          siswa: Math.round(pt.siswa * 1000) / 1000,
          b3: Math.round(pt.b3 * 1000) / 1000
        };
      }
      return {
        bahanPokokId: b.bahanPokokId,
        nama: b.nama,
        satuan: b.satuan,
        hargaSatuan: b.hargaSatuan,
        qtySiswa: Math.round(b.qtySiswa * 1000) / 1000,
        qtyB3: Math.round(b.qtyB3 * 1000) / 1000,
        qtyTotal: Math.round(b.qtyTotal * 1000) / 1000,
        subtotal: Math.round((b.qtyTotal * b.hargaSatuan) * 100) / 100,
        perTanggal: roundedPerTanggal
      };
    });

    res.json({
      success: true,
      tanggalList: tanggalArr,
      menuDescription: Object.values(menuByTanggal).filter(Boolean).join(", "),
      menuByTanggal,
      ingredients: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses kebutuhan PO" });
  }
});

// POST /api/mitra/po - DEPRECATED: PO sekarang dibuat oleh Akuntan
router.post("/po", requireAuth, requireRole("MITRA"), (req, res) => {
  res.status(410).json({
    error: "PO sekarang dibuat oleh Akuntan. Gunakan endpoint POST /api/akuntan/po."
  });
});

// PUT /api/mitra/po/:id/realisasi - Mitra menginput realisasi belanja
router.put("/po/:id/realisasi", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items realisasi tidak boleh kosong" });
    }

    const po = await prisma.transaksiPembelian.findUnique({ where: { id } });
    if (!po) return res.status(404).json({ error: "PO tidak ditemukan" });

    if (po.status !== "DIAJUKAN") {
      return res.status(409).json({
        error: "PO sudah direalisasi atau diterima, tidak bisa diubah lagi"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const { itemId, qtyRealisasi, hargaSatuanRealisasi } = item;

        if (!itemId) throw new Error("[VALIDASI] itemId wajib ada di setiap item realisasi");

        // Validate item ownership — item must belong to this PO
        const dbItem = await tx.transaksiPembelianItem.findUnique({ where: { id: itemId } });
        if (!dbItem || dbItem.transaksiId !== po.id) {
          throw new Error("[VALIDASI] Item tidak ditemukan pada PO ini");
        }

        const qty = parseFloat(qtyRealisasi);
        const harga = parseFloat(hargaSatuanRealisasi);
        if (isNaN(qty) || qty < 0) {
          throw new Error(`[VALIDASI] qtyRealisasi untuk item ${itemId} tidak valid`);
        }
        if (isNaN(harga) || harga < 0) {
          throw new Error(`[VALIDASI] hargaSatuanRealisasi untuk item ${itemId} tidak valid`);
        }

        await tx.transaksiPembelianItem.update({
          where: { id: itemId },
          data: {
            qtyRealisasi: Math.round(qty * 1000) / 1000,
            hargaSatuanRealisasi: Math.round(harga * 100) / 100,
            subtotalRealisasi: Math.round((qty * harga) * 100) / 100,
            updatedById: req.user.sub
          }
        });
      }

      // Check if ALL items of this PO now have qtyRealisasi
      const allItems = await tx.transaksiPembelianItem.findMany({
        where: { transaksiId: po.id },
        select: { qtyRealisasi: true }
      });
      const allRealized = allItems.every(i => i.qtyRealisasi !== null);
      const newStatus = allRealized ? "DIREALISASI" : "DIAJUKAN";

      return await tx.transaksiPembelian.update({
        where: { id },
        data: { status: newStatus },
        include: {
          items: { include: { bahanPokok: true } },
          supplier: true
        }
      });
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.startsWith("[VALIDASI]")) {
      return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan realisasi PO" });
  }
});

// GET /api/mitra/po/list - List all TransaksiPembelian (POs) for a period
router.get("/po/list", requireAuth, requireRole("MITRA", "AKUNTAN", "ASLAP"), async (req, res) => {
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
