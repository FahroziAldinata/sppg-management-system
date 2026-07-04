const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // gagal cepat drpd jalan diam2 pakai secret kosong/undefined
  throw new Error("JWT_SECRET belum diset di .env");
}

// Cek header "Authorization: Bearer <token>", verifikasi, taruh payload di req.user
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token tidak ada. Kirim header Authorization: Bearer <token>" });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Token tidak valid atau kadaluarsa" });
  }

  req.user = payload; // { sub, username, role, nama }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { aktif: true }
    });

    if (!user || !user.aktif) {
      return res.status(401).json({ error: "Akun tidak aktif atau tidak ditemukan, silakan hubungi admin" });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Terjadi kesalahan server saat verifikasi akun" });
  }
}

// Dipanggil SETELAH requireAuth. Contoh: requireRole("AKUNTAN", "KEPALA_SPPG")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Belum login" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Role ${req.user.role} tidak diizinkan akses ini` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };