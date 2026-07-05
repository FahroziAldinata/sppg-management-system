const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/gizi/kelompok-umur-menu - List all KelompokUmurMenu (dropdown untuk MenuHarianBlok)
router.get("/kelompok-umur-menu", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.kelompokUmurMenu.findMany({
      orderBy: { kode: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kelompok umur menu" });
  }
});

// ==========================================
// CRUD MENU HARIAN
// ==========================================

// GET /api/gizi/menu-harian - List MenuHarian per period
router.get("/menu-harian", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const data = await prisma.menuHarian.findMany({
      where: { periodeId },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: true,
            organoleptik: true,
            alergi: true,
            menuItem: { include: { bahan: true } }
          }
        }
      },
      orderBy: { tanggal: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu harian" });
  }
});

// GET /api/gizi/menu-harian/:id - Get single MenuHarian with blocks
router.get("/menu-harian/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuHarian.findUnique({
      where: { id },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: true,
            organoleptik: true,
            alergi: true,
            menuItem: { include: { bahan: true } }
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu harian" });
  }
});

// POST /api/gizi/menu-harian - Create MenuHarian and optional blocks
router.post("/menu-harian", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { periodeId, tanggal, blok } = req.body || {};

    // 1. Basic validation
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
      // 2. Validate period exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 3. Validasi: tanggal wajib dalam rentang periode — FINAL, dikonfirmasi user
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal menu harian harus berada di dalam batas rentang periode");
      }

      // 4. Validate unique constraint: [periodeId, tanggal]
      const existing = await tx.menuHarian.findUnique({
        where: {
          periodeId_tanggal: {
            periodeId,
            tanggal: targetTanggal
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Menu harian untuk tanggal ini sudah terdaftar pada periode terpilih");
      }

      // 5. Create MenuHarian
      const menuHarian = await tx.menuHarian.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          status: "DRAFT"
        }
      });

      // 6. Create blocks if provided
      if (blok && Array.isArray(blok) && blok.length > 0) {
        // Prevent duplicate kelompokUmurMenuId in payload
        const seenIds = new Set();
        for (const b of blok) {
          if (!b.kelompokUmurMenuId) {
            throw new Error("[VALIDASI] kelompokUmurMenuId wajib diisi pada setiap blok");
          }
          if (seenIds.has(b.kelompokUmurMenuId)) {
            throw new Error(`[VALIDASI] Duplikasi kelompokUmurMenuId '${b.kelompokUmurMenuId}' dalam payload`);
          }
          seenIds.add(b.kelompokUmurMenuId);

          // Verify kelompokUmurMenu exists
          const exists = await tx.kelompokUmurMenu.findUnique({ where: { id: b.kelompokUmurMenuId } });
          if (!exists) {
            throw new Error(`[NOT_FOUND] Kelompok umur menu ID '${b.kelompokUmurMenuId}' tidak ditemukan`);
          }

          // Create block
          await tx.menuHarianBlok.create({
            data: {
              menuHarianId: menuHarian.id,
              kelompokUmurMenuId: b.kelompokUmurMenuId,
              createdById: req.user.sub
            }
          });
        }
      }

      // Return complete object
      return await tx.menuHarian.findUnique({
        where: { id: menuHarian.id },
        include: {
          blok: {
            include: {
              kelompokUmurMenu: true
            }
          }
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Menu harian atau blok kelompok umur sudah terdaftar" });
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data menu harian" });
  }
});

// PUT /api/gizi/menu-harian/:id - Update MenuHarian (e.g. tanggal)
// PUT /api/gizi/menu-harian/:id - Update MenuHarian (e.g. tanggal atau status)
router.put("/menu-harian/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, status } = req.body || {};

    if (!tanggal && !status) {
      return res.status(400).json({ error: "tanggal atau status wajib diisi untuk melakukan perubahan" });
    }

    if (status && status !== "DRAFT" && status !== "DIAJUKAN") {
      return res.status(400).json({ error: "Ahli Gizi hanya dapat mengubah status menjadi DRAFT atau DIAJUKAN" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuHarian.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data menu harian tidak ditemukan");
      }

      // Validasi: Status existing harus DRAFT atau DITOLAK agar bisa diedit
      if (existing.status !== "DRAFT" && existing.status !== "DITOLAK") {
        throw new Error("[VALIDASI] Menu harian yang sudah diajukan atau disetujui tidak dapat diubah");
      }

      const updateData = {};

      if (tanggal) {
        const targetTanggal = new Date(tanggal);
        if (isNaN(targetTanggal.getTime())) {
          throw new Error("[VALIDASI] Format tanggal tidak valid");
        }

        // Validasi: tanggal wajib dalam rentang periode
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal menu harian harus berada di dalam batas rentang periode");
        }

        // Check unique constraint excluding self
        const conflict = await tx.menuHarian.findFirst({
          where: {
            periodeId: existing.periodeId,
            tanggal: targetTanggal,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] Menu harian untuk tanggal ini sudah terdaftar pada periode terpilih");
        }

        updateData.tanggal = targetTanggal;
      }

      if (status) {
        updateData.status = status;
      }

      return await tx.menuHarian.update({
        where: { id },
        data: updateData,
        include: {
          blok: {
            include: {
              kelompokUmurMenu: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Menu harian untuk tanggal ini sudah terdaftar" });
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data menu harian" });
  }
});

// DELETE /api/gizi/menu-harian/:id - Delete MenuHarian (and cascade blocks)
router.delete("/menu-harian/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuHarian.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }

    // Cascade delete shipments, approvals, and blocks
    await prisma.$transaction(async (tx) => {
      await tx.pengirimanHarian.deleteMany({
        where: { menuHarianId: id }
      });
      await tx.approval.deleteMany({
        where: { menuHarianId: id }
      });
      await tx.menuHarianBlok.deleteMany({
        where: { menuHarianId: id }
      });
      await tx.menuHarian.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: "Data menu harian berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data menu harian" });
  }
});

// ==========================================
// CRUD MENU HARIAN BLOK
// ==========================================

// POST /api/gizi/menu-harian-blok - Add block to existing MenuHarian
router.post("/menu-harian-blok", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { menuHarianId, kelompokUmurMenuId } = req.body || {};

    if (!menuHarianId) return res.status(400).json({ error: "menuHarianId wajib diisi" });
    if (!kelompokUmurMenuId) return res.status(400).json({ error: "kelompokUmurMenuId wajib diisi" });

    const created = await prisma.$transaction(async (tx) => {
      // Validate MenuHarian exists
      const menuHarian = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
      if (!menuHarian) {
        throw new Error("[NOT_FOUND] Data menu harian tidak ditemukan");
      }

      // Validate kelompokUmurMenu exists
      const kelompokUmur = await tx.kelompokUmurMenu.findUnique({ where: { id: kelompokUmurMenuId } });
      if (!kelompokUmur) {
        throw new Error("[NOT_FOUND] Kelompok umur menu tidak ditemukan");
      }

      // Validate unique constraint: [menuHarianId, kelompokUmurMenuId]
      const existing = await tx.menuHarianBlok.findUnique({
        where: {
          menuHarianId_kelompokUmurMenuId: {
            menuHarianId,
            kelompokUmurMenuId
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Blok kelompok umur ini sudah terdaftar pada menu harian terpilih");
      }

      return await tx.menuHarianBlok.create({
        data: {
          menuHarianId,
          kelompokUmurMenuId,
          createdById: req.user.sub
        },
        include: {
          kelompokUmurMenu: true
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Blok kelompok umur ini sudah terdaftar pada menu harian terpilih" });
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan blok menu harian" });
  }
});

// DELETE /api/gizi/menu-harian-blok/:id - Delete block
router.delete("/menu-harian-blok/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuHarianBlok.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data blok menu harian tidak ditemukan" });
    }

    await prisma.menuHarianBlok.delete({ where: { id } });

    res.json({ success: true, message: "Data blok menu harian berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data blok menu harian tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus blok menu harian" });
  }
});

// ==========================================
// CRUD MENU ITEM
// ==========================================

// GET /api/gizi/menu-item/:id - Detail MenuItem
router.get("/menu-item/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        bahan: {
          include: {
            bahanPokok: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu item" });
  }
});

// POST /api/gizi/menu-item - Create MenuItem
router.post("/menu-item", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { blokId, namaMenu, komponen } = req.body || {};

    if (!blokId) return res.status(400).json({ error: "blokId wajib diisi" });
    if (!namaMenu) return res.status(400).json({ error: "namaMenu wajib diisi" });

    // Validate komponen if provided
    const validKomponen = ["KARBOHIDRAT", "LAUK_HEWANI", "LAUK_NABATI", "SAYUR", "BUAH"];
    if (komponen && !validKomponen.includes(komponen)) {
      return res.status(400).json({ error: `komponen harus berupa salah satu dari: ${validKomponen.join(", ")}` });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) {
        throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");
      }

      return await tx.menuItem.create({
        data: {
          blokId,
          namaMenu,
          komponen
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data menu item" });
  }
});

// PUT /api/gizi/menu-item/:id - Update MenuItem
router.put("/menu-item/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { namaMenu, komponen } = req.body || {};

    const validKomponen = ["KARBOHIDRAT", "LAUK_HEWANI", "LAUK_NABATI", "SAYUR", "BUAH"];
    if (komponen && !validKomponen.includes(komponen)) {
      return res.status(400).json({ error: `komponen harus berupa salah satu dari: ${validKomponen.join(", ")}` });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.menuItem.findUnique({ where: { id } });
      if (!exists) {
        throw new Error("[NOT_FOUND] Data menu item tidak ditemukan");
      }

      return await tx.menuItem.update({
        where: { id },
        data: {
          namaMenu: namaMenu !== undefined ? namaMenu : undefined,
          komponen: komponen !== undefined ? komponen : undefined
        }
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data menu item" });
  }
});

// DELETE /api/gizi/menu-item/:id - Delete MenuItem
router.delete("/menu-item/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuItem.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }

    await prisma.menuItem.delete({ where: { id } });

    res.json({ success: true, message: "Data menu item berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data menu item" });
  }
});

// ==========================================
// CRUD MENU ITEM BAHAN
// ==========================================

// GET /api/gizi/menu-item-bahan/:id - Detail MenuItemBahan
router.get("/menu-item-bahan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuItemBahan.findUnique({
      where: { id },
      include: {
        bahanPokok: true
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data bahan menu item tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data bahan menu item" });
  }
});

// POST /api/gizi/menu-item-bahan - Create MenuItemBahan
router.post("/menu-item-bahan", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const {
      menuItemId,
      bahanPokokId,
      beratBersihGr,
      beratURT,
      energiKkal,
      proteinGr,
      lemakGr,
      karbohidratGr,
      seratGr,
      bddPersen,
      hargaSatuan,
      beratSatuanGr
    } = req.body || {};

    // Validate required fields
    if (!menuItemId) return res.status(400).json({ error: "menuItemId wajib diisi" });
    if (!bahanPokokId) return res.status(400).json({ error: "bahanPokokId wajib diisi" });
    if (beratBersihGr === undefined) return res.status(400).json({ error: "beratBersihGr wajib diisi" });
    if (bddPersen === undefined) return res.status(400).json({ error: "bddPersen wajib diisi" });
    if (hargaSatuan === undefined) return res.status(400).json({ error: "hargaSatuan wajib diisi" });
    if (beratSatuanGr === undefined) return res.status(400).json({ error: "beratSatuanGr wajib diisi" });

    // Gizi fields are required
    if (energiKkal === undefined) return res.status(400).json({ error: "energiKkal wajib diisi" });
    if (proteinGr === undefined) return res.status(400).json({ error: "proteinGr wajib diisi" });
    if (lemakGr === undefined) return res.status(400).json({ error: "lemakGr wajib diisi" });
    if (karbohidratGr === undefined) return res.status(400).json({ error: "karbohidratGr wajib diisi" });
    if (seratGr === undefined) return res.status(400).json({ error: "seratGr wajib diisi" });

    // Validate numeric non-negative constraints
    const cleanBeratBersih = Number(beratBersihGr);
    const cleanBdd = Number(bddPersen);
    const cleanHarga = Number(hargaSatuan);
    const cleanBeratSatuan = Number(beratSatuanGr);
    const cleanEnergi = Number(energiKkal);
    const cleanProtein = Number(proteinGr);
    const cleanLemak = Number(lemakGr);
    const cleanKarbo = Number(karbohidratGr);
    const cleanSerat = Number(seratGr);

    if (isNaN(cleanBeratBersih) || cleanBeratBersih < 0) return res.status(400).json({ error: "beratBersihGr harus berupa angka non-negatif" });
    if (isNaN(cleanBdd) || cleanBdd <= 0 || cleanBdd > 100) return res.status(400).json({ error: "bddPersen harus bernilai antara 1 dan 100" });
    if (isNaN(cleanHarga) || cleanHarga < 0) return res.status(400).json({ error: "hargaSatuan harus berupa angka non-negatif" });
    if (isNaN(cleanBeratSatuan) || cleanBeratSatuan <= 0) return res.status(400).json({ error: "beratSatuanGr harus bernilai positif lebih besar dari 0" });
    if (isNaN(cleanEnergi) || cleanEnergi < 0) return res.status(400).json({ error: "energiKkal harus berupa angka non-negatif" });
    if (isNaN(cleanProtein) || cleanProtein < 0) return res.status(400).json({ error: "proteinGr harus berupa angka non-negatif" });
    if (isNaN(cleanLemak) || cleanLemak < 0) return res.status(400).json({ error: "lemakGr harus berupa angka non-negatif" });
    if (isNaN(cleanKarbo) || cleanKarbo < 0) return res.status(400).json({ error: "karbohidratGr harus berupa angka non-negatif" });
    if (isNaN(cleanSerat) || cleanSerat < 0) return res.status(400).json({ error: "seratGr harus berupa angka non-negatif" });

    // Calculate formulas in app-layer
    const beratKotorGr = cleanBeratBersih / cleanBdd * 100;
    const totalHargaBahan = beratKotorGr * cleanHarga / cleanBeratSatuan;

    const created = await prisma.$transaction(async (tx) => {
      // Validate menuItem exists
      const menuItem = await tx.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem) {
        throw new Error("[NOT_FOUND] Menu item tidak ditemukan");
      }

      // Validate bahanPokok exists
      const bahanPokok = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
      if (!bahanPokok) {
        throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
      }

      return await tx.menuItemBahan.create({
        data: {
          menuItemId,
          bahanPokokId,
          beratBersihGr: cleanBeratBersih,
          beratURT,
          energiKkal: cleanEnergi,
          proteinGr: cleanProtein,
          lemakGr: cleanLemak,
          karbohidratGr: cleanKarbo,
          seratGr: cleanSerat,
          bddPersen: cleanBdd,
          beratKotorGr,
          hargaSatuan: cleanHarga,
          beratSatuanGr: cleanBeratSatuan,
          totalHargaBahan
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan bahan menu item" });
  }
});

// PUT /api/gizi/menu-item-bahan/:id - Update MenuItemBahan
router.put("/menu-item-bahan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      beratBersihGr,
      beratURT,
      energiKkal,
      proteinGr,
      lemakGr,
      karbohidratGr,
      seratGr,
      bddPersen,
      hargaSatuan,
      beratSatuanGr
    } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItemBahan.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data bahan menu item tidak ditemukan");
      }

      // Merge current values with updates
      const cleanBeratBersih = beratBersihGr !== undefined ? Number(beratBersihGr) : Number(existing.beratBersihGr);
      const cleanBdd = bddPersen !== undefined ? Number(bddPersen) : Number(existing.bddPersen);
      const cleanHarga = hargaSatuan !== undefined ? Number(hargaSatuan) : Number(existing.hargaSatuan);
      const cleanBeratSatuan = beratSatuanGr !== undefined ? Number(beratSatuanGr) : Number(existing.beratSatuanGr);

      const cleanEnergi = energiKkal !== undefined ? Number(energiKkal) : Number(existing.energiKkal);
      const cleanProtein = proteinGr !== undefined ? Number(proteinGr) : Number(existing.proteinGr);
      const cleanLemak = lemakGr !== undefined ? Number(lemakGr) : Number(existing.lemakGr);
      const cleanKarbo = karbohidratGr !== undefined ? Number(karbohidratGr) : Number(existing.karbohidratGr);
      const cleanSerat = seratGr !== undefined ? Number(seratGr) : Number(existing.seratGr);

      if (isNaN(cleanBeratBersih) || cleanBeratBersih < 0) throw new Error("[VALIDASI] beratBersihGr harus berupa angka non-negatif");
      if (isNaN(cleanBdd) || cleanBdd <= 0 || cleanBdd > 100) throw new Error("[VALIDASI] bddPersen harus bernilai antara 1 dan 100");
      if (isNaN(cleanHarga) || cleanHarga < 0) throw new Error("[VALIDASI] hargaSatuan harus berupa angka non-negatif");
      if (isNaN(cleanBeratSatuan) || cleanBeratSatuan <= 0) throw new Error("[VALIDASI] beratSatuanGr harus bernilai positif lebih besar dari 0");
      if (isNaN(cleanEnergi) || cleanEnergi < 0) throw new Error("[VALIDASI] energiKkal harus berupa angka non-negatif");
      if (isNaN(cleanProtein) || cleanProtein < 0) throw new Error("[VALIDASI] proteinGr harus berupa angka non-negatif");
      if (isNaN(cleanLemak) || cleanLemak < 0) throw new Error("[VALIDASI] lemakGr harus berupa angka non-negatif");
      if (isNaN(cleanKarbo) || cleanKarbo < 0) throw new Error("[VALIDASI] karbohidratGr harus berupa angka non-negatif");
      if (isNaN(cleanSerat) || cleanSerat < 0) throw new Error("[VALIDASI] seratGr harus berupa angka non-negatif");

      // Calculate formulas in app-layer
      const beratKotorGr = cleanBeratBersih / cleanBdd * 100;
      const totalHargaBahan = beratKotorGr * cleanHarga / cleanBeratSatuan;

      return await tx.menuItemBahan.update({
        where: { id },
        data: {
          beratBersihGr: cleanBeratBersih,
          beratURT: beratURT !== undefined ? beratURT : undefined,
          energiKkal: cleanEnergi,
          proteinGr: cleanProtein,
          lemakGr: cleanLemak,
          karbohidratGr: cleanKarbo,
          seratGr: cleanSerat,
          bddPersen: cleanBdd,
          beratKotorGr,
          hargaSatuan: cleanHarga,
          beratSatuanGr: cleanBeratSatuan,
          totalHargaBahan
        }
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui bahan menu item" });
  }
});

// DELETE /api/gizi/menu-item-bahan/:id - Delete MenuItemBahan
router.delete("/menu-item-bahan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuItemBahan.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data bahan menu item tidak ditemukan" });
    }

    await prisma.menuItemBahan.delete({ where: { id } });

    res.json({ success: true, message: "Data bahan menu item berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data bahan menu item tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus bahan menu item" });
  }
});

// ==========================================
// CRUD MENU TARGET GIZI (1:1 with block)
// ==========================================

// GET /api/gizi/menu-target-gizi/:id - Detail MenuTargetGizi
router.get("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuTargetGizi.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data target gizi tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil target gizi" });
  }
});

// POST /api/gizi/menu-target-gizi - Create MenuTargetGizi
router.post("/menu-target-gizi", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { blokId, targetEnergi, targetProtein, targetLemak, targetKarbohidrat, targetSerat } = req.body || {};

    if (!blokId) return res.status(400).json({ error: "blokId wajib diisi" });
    if (targetEnergi === undefined) return res.status(400).json({ error: "targetEnergi wajib diisi" });
    if (targetProtein === undefined) return res.status(400).json({ error: "targetProtein wajib diisi" });
    if (targetLemak === undefined) return res.status(400).json({ error: "targetLemak wajib diisi" });
    if (targetKarbohidrat === undefined) return res.status(400).json({ error: "targetKarbohidrat wajib diisi" });
    if (targetSerat === undefined) return res.status(400).json({ error: "targetSerat wajib diisi" });

    const cleanEnergi = Number(targetEnergi);
    const cleanProtein = Number(targetProtein);
    const cleanLemak = Number(targetLemak);
    const cleanKarbo = Number(targetKarbohidrat);
    const cleanSerat = Number(targetSerat);

    if (isNaN(cleanEnergi) || cleanEnergi < 0) return res.status(400).json({ error: "targetEnergi harus berupa angka non-negatif" });
    if (isNaN(cleanProtein) || cleanProtein < 0) return res.status(400).json({ error: "targetProtein harus berupa angka non-negatif" });
    if (isNaN(cleanLemak) || cleanLemak < 0) return res.status(400).json({ error: "targetLemak harus berupa angka non-negatif" });
    if (isNaN(cleanKarbo) || cleanKarbo < 0) return res.status(400).json({ error: "targetKarbohidrat harus berupa angka non-negatif" });
    if (isNaN(cleanSerat) || cleanSerat < 0) return res.status(400).json({ error: "targetSerat harus berupa angka non-negatif" });

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.menuTargetGizi.create({
        data: {
          blokId,
          targetEnergi: cleanEnergi,
          targetProtein: cleanProtein,
          targetLemak: cleanLemak,
          targetKarbohidrat: cleanKarbo,
          targetSerat: cleanSerat
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Target gizi untuk blok ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan target gizi" });
  }
});

// PUT /api/gizi/menu-target-gizi/:id - Update MenuTargetGizi
router.put("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEnergi, targetProtein, targetLemak, targetKarbohidrat, targetSerat } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuTargetGizi.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data target gizi tidak ditemukan");

      const cleanEnergi = targetEnergi !== undefined ? Number(targetEnergi) : Number(existing.targetEnergi);
      const cleanProtein = targetProtein !== undefined ? Number(targetProtein) : Number(existing.targetProtein);
      const cleanLemak = targetLemak !== undefined ? Number(targetLemak) : Number(existing.targetLemak);
      const cleanKarbo = targetKarbohidrat !== undefined ? Number(targetKarbohidrat) : Number(existing.targetKarbohidrat);
      const cleanSerat = targetSerat !== undefined ? Number(targetSerat) : Number(existing.targetSerat);

      if (isNaN(cleanEnergi) || cleanEnergi < 0) throw new Error("[VALIDASI] targetEnergi harus berupa angka non-negatif");
      if (isNaN(cleanProtein) || cleanProtein < 0) throw new Error("[VALIDASI] targetProtein harus berupa angka non-negatif");
      if (isNaN(cleanLemak) || cleanLemak < 0) throw new Error("[VALIDASI] targetLemak harus berupa angka non-negatif");
      if (isNaN(cleanKarbo) || cleanKarbo < 0) throw new Error("[VALIDASI] targetKarbohidrat harus berupa angka non-negatif");
      if (isNaN(cleanSerat) || cleanSerat < 0) throw new Error("[VALIDASI] targetSerat harus berupa angka non-negatif");

      return await tx.menuTargetGizi.update({
        where: { id },
        data: {
          targetEnergi: cleanEnergi,
          targetProtein: cleanProtein,
          targetLemak: cleanLemak,
          targetKarbohidrat: cleanKarbo,
          targetSerat: cleanSerat
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui target gizi" });
  }
});

// DELETE /api/gizi/menu-target-gizi/:id - Delete MenuTargetGizi
router.delete("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.menuTargetGizi.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data target gizi tidak ditemukan" });

    await prisma.menuTargetGizi.delete({ where: { id } });
    res.json({ success: true, message: "Data target gizi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data target gizi tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus target gizi" });
  }
});

// ==========================================
// CRUD MENU ORGANOLEPTIK (1:1 with block)
// ==========================================

// GET /api/gizi/menu-organoleptik/:id - Detail MenuOrganoleptik
router.get("/menu-organoleptik/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuOrganoleptik.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil uji organoleptik" });
  }
});

// POST /api/gizi/menu-organoleptik - Create MenuOrganoleptik
router.post("/menu-organoleptik", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { blokId, rasa, aroma, tekstur, suhuSaji, catatan, ujiPadaTanggal, jumlahOmpreng } = req.body || {};

    if (!blokId) return res.status(400).json({ error: "blokId wajib diisi" });
    if (!rasa) return res.status(400).json({ error: "rasa wajib diisi" });
    if (!aroma) return res.status(400).json({ error: "aroma wajib diisi" });
    if (!tekstur) return res.status(400).json({ error: "tekstur wajib diisi" });
    if (!suhuSaji) return res.status(400).json({ error: "suhuSaji wajib diisi" });

    const cleanJumlahOmpreng = jumlahOmpreng !== undefined ? parseInt(jumlahOmpreng, 10) : 1;
    if (isNaN(cleanJumlahOmpreng) || cleanJumlahOmpreng <= 0) {
      return res.status(400).json({ error: "jumlahOmpreng harus berupa bilangan bulat positif" });
    }

    const targetUjiTanggal = ujiPadaTanggal ? new Date(ujiPadaTanggal) : new Date();
    if (isNaN(targetUjiTanggal.getTime())) {
      return res.status(400).json({ error: "Format ujiPadaTanggal tidak valid" });
    }
    const tanggalMusnah = new Date(targetUjiTanggal.getTime() + 3 * 24 * 60 * 60 * 1000); // retensi 3 hari

    const created = await prisma.$transaction(async (tx) => {
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.menuOrganoleptik.create({
        data: {
          blokId,
          rasa,
          aroma,
          tekstur,
          suhuSaji,
          catatan,
          ujiPadaTanggal: targetUjiTanggal,
          jumlahOmpreng: cleanJumlahOmpreng,
          tanggalMusnah
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Uji organoleptik untuk blok ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan uji organoleptik" });
  }
});

// PUT /api/gizi/menu-organoleptik/:id - Update MenuOrganoleptik
router.put("/menu-organoleptik/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { rasa, aroma, tekstur, suhuSaji, catatan, ujiPadaTanggal, jumlahOmpreng } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuOrganoleptik.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data uji organoleptik tidak ditemukan");

      let cleanJumlahOmpreng = existing.jumlahOmpreng;
      if (jumlahOmpreng !== undefined) {
        cleanJumlahOmpreng = parseInt(jumlahOmpreng, 10);
        if (isNaN(cleanJumlahOmpreng) || cleanJumlahOmpreng <= 0) {
          throw new Error("[VALIDASI] jumlahOmpreng harus berupa bilangan bulat positif");
        }
      }

      let targetUjiTanggal = existing.ujiPadaTanggal;
      let tanggalMusnah = existing.tanggalMusnah;
      if (ujiPadaTanggal !== undefined) {
        targetUjiTanggal = new Date(ujiPadaTanggal);
        if (isNaN(targetUjiTanggal.getTime())) {
          throw new Error("[VALIDASI] Format ujiPadaTanggal tidak valid");
        }
        tanggalMusnah = new Date(targetUjiTanggal.getTime() + 3 * 24 * 60 * 60 * 1000);
      }

      return await tx.menuOrganoleptik.update({
        where: { id },
        data: {
          rasa: rasa !== undefined ? rasa : undefined,
          aroma: aroma !== undefined ? aroma : undefined,
          tekstur: tekstur !== undefined ? tekstur : undefined,
          suhuSaji: suhuSaji !== undefined ? suhuSaji : undefined,
          catatan: catatan !== undefined ? catatan : undefined,
          ujiPadaTanggal: targetUjiTanggal,
          jumlahOmpreng: cleanJumlahOmpreng,
          tanggalMusnah
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui uji organoleptik" });
  }
});

// DELETE /api/gizi/menu-organoleptik/:id - Delete MenuOrganoleptik
router.delete("/menu-organoleptik/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.menuOrganoleptik.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });

    await prisma.menuOrganoleptik.delete({ where: { id } });
    res.json({ success: true, message: "Data uji organoleptik berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus uji organoleptik" });
  }
});

// ==========================================
// CRUD ALERGI CATATAN (1:many with block)
// ==========================================

// GET /api/gizi/alergi-catatan - List AlergiCatatan by block
router.get("/alergi-catatan", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { blokId } = req.query;
    if (!blokId) return res.status(400).json({ error: "blokId query parameter wajib dikirimkan" });

    const list = await prisma.alergiCatatan.findMany({
      where: { blokId }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar catatan alergi" });
  }
});

// GET /api/gizi/alergi-catatan/:id - Detail AlergiCatatan
router.get("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.alergiCatatan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil catatan alergi" });
  }
});

// POST /api/gizi/alergi-catatan - Create AlergiCatatan
router.post("/alergi-catatan", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { blokId, jenisAlergi, jumlahSiswa, bahanPengganti } = req.body || {};

    if (!blokId) return res.status(400).json({ error: "blokId wajib diisi" });
    if (!jenisAlergi) return res.status(400).json({ error: "jenisAlergi wajib diisi" });
    if (jumlahSiswa === undefined) return res.status(400).json({ error: "jumlahSiswa wajib diisi" });

    const cleanJumlah = Number(jumlahSiswa);
    if (isNaN(cleanJumlah) || cleanJumlah < 0 || !Number.isInteger(cleanJumlah)) {
      return res.status(400).json({ error: "jumlahSiswa harus berupa bilangan bulat non-negatif" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.alergiCatatan.create({
        data: {
          blokId,
          jenisAlergi,
          jumlahSiswa: cleanJumlah,
          bahanPengganti
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan catatan alergi" });
  }
});

// PUT /api/gizi/alergi-catatan/:id - Update AlergiCatatan
router.put("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { jenisAlergi, jumlahSiswa, bahanPengganti } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.alergiCatatan.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data catatan alergi tidak ditemukan");

      let cleanJumlah = existing.jumlahSiswa;
      if (jumlahSiswa !== undefined) {
        cleanJumlah = Number(jumlahSiswa);
        if (isNaN(cleanJumlah) || cleanJumlah < 0 || !Number.isInteger(cleanJumlah)) {
          throw new Error("[VALIDASI] jumlahSiswa harus berupa bilangan bulat non-negatif");
        }
      }

      return await tx.alergiCatatan.update({
        where: { id },
        data: {
          jenisAlergi: jenisAlergi !== undefined ? jenisAlergi : undefined,
          jumlahSiswa: cleanJumlah,
          bahanPengganti: bahanPengganti !== undefined ? bahanPengganti : undefined
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui catatan alergi" });
  }
});

// DELETE /api/gizi/alergi-catatan/:id - Delete AlergiCatatan
router.delete("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.alergiCatatan.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });

    await prisma.alergiCatatan.delete({ where: { id } });
    res.json({ success: true, message: "Data catatan alergi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus catatan alergi" });
  }
});

// ==========================================
// CRUD KENDARAAN (Logistics Setup)
// ==========================================

// GET /api/gizi/kendaraan - List Kendaraan
router.get("/kendaraan", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const list = await prisma.kendaraan.findMany();
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar kendaraan" });
  }
});

// GET /api/gizi/kendaraan/:id - Detail Kendaraan
router.get("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
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

// POST /api/gizi/kendaraan - Create Kendaraan
router.post("/kendaraan", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
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

// PUT /api/gizi/kendaraan/:id - Update Kendaraan
router.put("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
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

// DELETE /api/gizi/kendaraan/:id - Delete Kendaraan
router.delete("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.kendaraan.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });

    await prisma.kendaraan.delete({ where: { id } });
    res.json({ success: true, message: "Data kendaraan berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus kendaraan" });
  }
});

// ==========================================
// CRUD PENGIRIMAN HARIAN (Logistics Delivery)
// ==========================================

// GET /api/gizi/pengiriman - List PengirimanHarian
router.get("/pengiriman", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { menuHarianId } = req.query;
    const list = await prisma.pengirimanHarian.findMany({
      where: menuHarianId ? { menuHarianId } : {},
      include: {
        kendaraan: true
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar pengiriman" });
  }
});

// GET /api/gizi/pengiriman/:id - Detail PengirimanHarian
router.get("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.pengirimanHarian.findUnique({
      where: { id },
      include: { kendaraan: true }
    });
    if (!data) return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail pengiriman" });
  }
});

// POST /api/gizi/pengiriman - Create PengirimanHarian
router.post("/pengiriman", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { menuHarianId, jenisPorsi, kendaraanId, catatan } = req.body || {};

    if (!menuHarianId) return res.status(400).json({ error: "menuHarianId wajib diisi" });
    if (!jenisPorsi) return res.status(400).json({ error: "jenisPorsi wajib diisi" });
    if (!kendaraanId) return res.status(400).json({ error: "kendaraanId wajib diisi" });

    const validPorsi = ["KECIL", "BESAR"];
    if (!validPorsi.includes(jenisPorsi)) {
      return res.status(400).json({ error: `jenisPorsi harus berupa salah satu dari: ${validPorsi.join(", ")}` });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Validate MenuHarian exists
      const menu = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
      if (!menu) throw new Error("[NOT_FOUND] Menu harian tidak ditemukan");

      // Validate Kendaraan exists
      const vehicle = await tx.kendaraan.findUnique({ where: { id: kendaraanId } });
      if (!vehicle) throw new Error("[NOT_FOUND] Kendaraan tidak ditemukan");

      // [ASUMSI] Kendaraan harus aktif untuk dapat digunakan mengirim porsi makanan
      if (!vehicle.aktif) {
        throw new Error("[VALIDASI] Kendaraan yang dipilih tidak aktif");
      }

      return await tx.pengirimanHarian.create({
        data: {
          menuHarianId,
          jenisPorsi,
          kendaraanId,
          catatan
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Pengiriman untuk menu harian dengan jenis porsi ini sudah terdaftar" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Menu harian atau kendaraan tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan pengiriman" });
  }
});

// PUT /api/gizi/pengiriman/:id - Update PengirimanHarian
router.put("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { menuHarianId, jenisPorsi, kendaraanId, catatan } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.pengirimanHarian.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data pengiriman tidak ditemukan");

      const cleanMenuHarianId = menuHarianId !== undefined ? menuHarianId : existing.menuHarianId;
      const cleanJenisPorsi = jenisPorsi !== undefined ? jenisPorsi : existing.jenisPorsi;

      if (menuHarianId !== undefined || jenisPorsi !== undefined) {
        const menu = await tx.menuHarian.findUnique({ where: { id: cleanMenuHarianId } });
        if (!menu) throw new Error("[NOT_FOUND] Menu harian tidak ditemukan");

        const validPorsi = ["KECIL", "BESAR"];
        if (!validPorsi.includes(cleanJenisPorsi)) {
          throw new Error("[VALIDASI] jenisPorsi harus berupa salah satu dari: KECIL, BESAR");
        }

        // Conflict check (exclusion pattern)
        const conflict = await tx.pengirimanHarian.findFirst({
          where: {
            menuHarianId: cleanMenuHarianId,
            jenisPorsi: cleanJenisPorsi,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] Pengiriman untuk menu harian dengan jenis porsi ini sudah terdaftar");
        }
      }

      if (kendaraanId !== undefined) {
        const vehicle = await tx.kendaraan.findUnique({ where: { id: kendaraanId } });
        if (!vehicle) throw new Error("[NOT_FOUND] Kendaraan tidak ditemukan");

        // [ASUMSI] Kendaraan harus aktif untuk dapat digunakan mengirim porsi makanan
        if (!vehicle.aktif) {
          throw new Error("[VALIDASI] Kendaraan yang dipilih tidak aktif");
        }
      }

      return await tx.pengirimanHarian.update({
        where: { id },
        data: {
          menuHarianId: menuHarianId !== undefined ? menuHarianId : undefined,
          jenisPorsi: jenisPorsi !== undefined ? jenisPorsi : undefined,
          kendaraanId: kendaraanId !== undefined ? kendaraanId : undefined,
          catatan: catatan !== undefined ? catatan : undefined
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Pengiriman untuk menu harian dengan jenis porsi ini sudah terdaftar" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Menu harian atau kendaraan tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      if (error.message.startsWith("[CONFLICT]")) return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui pengiriman" });
  }
});

// DELETE /api/gizi/pengiriman/:id - Delete PengirimanHarian
router.delete("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.pengirimanHarian.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });

    await prisma.pengirimanHarian.delete({ where: { id } });
    res.json({ success: true, message: "Data pengiriman berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus pengiriman" });
  }
});

// ==========================================
// CRUD MASTER MENU MINGGUAN (Optional rotational plans)
// ==========================================

// GET /api/gizi/master-menu - List MasterMenuMingguan
router.get("/master-menu", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, jalur, hari } = req.query;
    const list = await prisma.masterMenuMingguan.findMany({
      where: {
        periodeId: periodeId || undefined,
        jalur: jalur || undefined,
        hari: hari || undefined
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar master menu" });
  }
});

// GET /api/gizi/master-menu/:id - Detail MasterMenuMingguan
router.get("/master-menu/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.masterMenuMingguan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data master menu tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail master menu" });
  }
});

// POST /api/gizi/master-menu - Create MasterMenuMingguan
router.post("/master-menu", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { periodeId, jalur, hari, menuKarbohidrat, menuLaukHewani, menuLaukNabati, menuSayur, menuBuah } = req.body || {};

    if (!periodeId) return res.status(400).json({ error: "periodeId wajib diisi" });
    if (!jalur) return res.status(400).json({ error: "jalur wajib diisi" });
    if (!hari) return res.status(400).json({ error: "hari wajib diisi" });
    if (!menuKarbohidrat) return res.status(400).json({ error: "menuKarbohidrat wajib diisi" });
    if (!menuLaukHewani) return res.status(400).json({ error: "menuLaukHewani wajib diisi" });
    if (!menuLaukNabati) return res.status(400).json({ error: "menuLaukNabati wajib diisi" });
    if (!menuSayur) return res.status(400).json({ error: "menuSayur wajib diisi" });
    if (!menuBuah) return res.status(400).json({ error: "menuBuah wajib diisi" });

    const validJalur = ["SISWA", "TIGA_B"];
    if (!validJalur.includes(jalur)) {
      return res.status(400).json({ error: `jalur harus berupa salah satu dari: ${validJalur.join(", ")}` });
    }

    const validHari = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    if (!validHari.includes(hari)) {
      return res.status(400).json({ error: `hari harus berupa salah satu dari: ${validHari.join(", ")}` });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Validate Periode exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) throw new Error("[NOT_FOUND] Periode tidak ditemukan");

      return await tx.masterMenuMingguan.create({
        data: {
          periodeId,
          jalur,
          hari,
          menuKarbohidrat,
          menuLaukHewani,
          menuLaukNabati,
          menuSayur,
          menuBuah,
          createdById: req.user.sub
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Master menu untuk periode, jalur, dan hari ini sudah terdaftar" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Periode tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan master menu" });
  }
});

// PUT /api/gizi/master-menu/:id - Update MasterMenuMingguan
router.put("/master-menu/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodeId, jalur, hari, menuKarbohidrat, menuLaukHewani, menuLaukNabati, menuSayur, menuBuah } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.masterMenuMingguan.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data master menu tidak ditemukan");

      const cleanPeriodeId = periodeId !== undefined ? periodeId : existing.periodeId;
      const cleanJalur = jalur !== undefined ? jalur : existing.jalur;
      const cleanHari = hari !== undefined ? hari : existing.hari;

      if (periodeId !== undefined || jalur !== undefined || hari !== undefined) {
        const period = await tx.periode.findUnique({ where: { id: cleanPeriodeId } });
        if (!period) throw new Error("[NOT_FOUND] Periode tidak ditemukan");

        const validJalur = ["SISWA", "TIGA_B"];
        if (!validJalur.includes(cleanJalur)) {
          throw new Error("[VALIDASI] jalur harus berupa salah satu dari: SISWA, TIGA_B");
        }

        const validHari = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
        if (!validHari.includes(cleanHari)) {
          throw new Error("[VALIDASI] hari harus berupa salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU");
        }

        // Conflict check (exclusion pattern)
        const conflict = await tx.masterMenuMingguan.findFirst({
          where: {
            periodeId: cleanPeriodeId,
            jalur: cleanJalur,
            hari: cleanHari,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] Master menu untuk periode, jalur, dan hari ini sudah terdaftar");
        }
      }

      return await tx.masterMenuMingguan.update({
        where: { id },
        data: {
          periodeId: periodeId !== undefined ? periodeId : undefined,
          jalur: jalur !== undefined ? jalur : undefined,
          hari: hari !== undefined ? hari : undefined,
          menuKarbohidrat: menuKarbohidrat !== undefined ? menuKarbohidrat : undefined,
          menuLaukHewani: menuLaukHewani !== undefined ? menuLaukHewani : undefined,
          menuLaukNabati: menuLaukNabati !== undefined ? menuLaukNabati : undefined,
          menuSayur: menuSayur !== undefined ? menuSayur : undefined,
          menuBuah: menuBuah !== undefined ? menuBuah : undefined
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Master menu untuk periode, jalur, dan hari ini sudah terdaftar" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Periode tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      if (error.message.startsWith("[CONFLICT]")) return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui master menu" });
  }
});

// DELETE /api/gizi/master-menu/:id - Delete MasterMenuMingguan
router.delete("/master-menu/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.masterMenuMingguan.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data master menu tidak ditemukan" });

    await prisma.masterMenuMingguan.delete({ where: { id } });
    res.json({ success: true, message: "Data master menu berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data master menu tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus master menu" });
  }
});

module.exports = router;
