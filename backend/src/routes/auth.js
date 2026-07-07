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

// PUT /api/auth/profile - Update user profile & settings
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { nama, username, password } = req.body || {};
    const userId = req.user.sub;

    const data = {};
    if (nama) data.nama = nama;

    if (username) {
      // Check unique username conflict
      const exist = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });
      if (exist) {
        return res.status(409).json({ error: "Username sudah digunakan oleh user lain" });
      }
      data.username = username;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password minimal 6 karakter" });
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data
    });

    res.json({
      success: true,
      user: { id: updated.id, nama: updated.nama, username: updated.username, role: updated.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui profil" });
  }
});

module.exports = router;