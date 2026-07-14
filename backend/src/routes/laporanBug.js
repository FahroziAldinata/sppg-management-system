const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUS = ["BARU", "DIPROSES", "SELESAI"];

// POST /api/laporan-bug/submit
// Guard: requireAuth saja — semua role login boleh submit
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { judul, deskripsi } = req.body || {};

    if (!judul || !deskripsi) {
      return res.status(400).json({ error: "judul dan deskripsi wajib diisi" });
    }

    const laporan = await prisma.laporanBug.create({
      data: {
        pelaporId: req.user.sub,
        rolePelapor: req.user.role,
        judul,
        deskripsi,
      },
      select: {
        id: true,
        judul: true,
        deskripsi: true,
        rolePelapor: true,
        status: true,
        createdAt: true,
      },
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN", aktif: true },
      select: { id: true }
    });

    await prisma.notifikasi.createMany({
      data: adminUsers.map((a) => ({
        userId: a.id,
        judul: "Laporan Bug Baru",
        pesan: `Laporan "${judul}" dikirim oleh ${req.user.nama ?? req.user.username}.`,
        entityType: "BUG",
        entityId: laporan.id
      }))
    });

    res.status(201).json(laporan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengirim laporan bug" });
  }
});

// GET /api/laporan-bug
// Guard: requireAuth + requireRole("ADMIN") — admin only
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const laporan = await prisma.laporanBug.findMany({
      select: {
        id: true,
        judul: true,
        deskripsi: true,
        rolePelapor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        pelapor: { select: { nama: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(laporan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil daftar laporan bug" });
  }
});

// PATCH /api/laporan-bug/:id/status
// Guard: requireAuth + requireRole("ADMIN") — admin only
router.patch("/:id/status", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `status harus salah satu dari: ${VALID_STATUS.join(", ")}` });
    }

    const updated = await prisma.laporanBug.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        judul: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Laporan tidak ditemukan" });
    }
    res.status(500).json({ error: "Gagal memperbarui status laporan" });
  }
});

module.exports = router;
