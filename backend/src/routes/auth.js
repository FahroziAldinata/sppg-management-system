const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

const TOKEN_EXPIRY = "8h"; // 1 shift kerja. Sesuaikan kalau perlu.

// POST /api/auth/login  { username, password }
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "username dan password wajib diisi" });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  // Sengaja pesan error SAMA buat "user gak ada" & "password salah" —
  // jangan bocorin username mana yg valid ke penyerang.
  if (!user || !user.aktif) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const cocok = await bcrypt.compare(password, user.passwordHash);
  if (!cocok) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, nama: user.nama },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );

  res.json({
    token,
    user: { id: user.id, nama: user.nama, username: user.username, role: user.role },
  });
});

// GET /api/auth/me — cek token masih valid + data user terbaru (mis. kalau aktif di-nonaktifkan)
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

  if (!user || !user.aktif) {
    return res.status(401).json({ error: "User tidak aktif atau sudah dihapus" });
  }

  res.json({ id: user.id, nama: user.nama, username: user.username, role: user.role });
});

module.exports = router;