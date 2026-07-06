const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/notifikasi - Mengambil 20 notifikasi terbaru milik user login
router.get("/", requireAuth, async (req, res) => {
  try {
    const data = await prisma.notifikasi.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil notifikasi" });
  }
});

module.exports = router;
