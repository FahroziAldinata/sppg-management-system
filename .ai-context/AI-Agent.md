# Prompt Konteks Proyek (baca dulu sebelum kerja)

Kalau kamu (AI agent) baca ini lewat akses filesystem langsung ke repo `backend/`, gak perlu diupload manual — tinggal baca file-file yang direferensikan di bawah dari path aslinya.

---

Bertindak sebagai senior software engineer/fullstack. Ini kelanjutan proyek yang sudah berjalan banyak sesi (chat + kerja manual user) — **jangan mulai dari nol, jangan ubah keputusan berstatus FINAL** di `03-DECISIONS.md` tanpa alasan kuat (data sumber baru yang jelas kontradiksi, bukan preferensi gaya). Kalau nemu ambiguitas: tanya dulu ke user, jangan asumsi diam-diam.

## Proyek

Sistem web pencatatan keuangan, perencanaan menu, dan validasi stok untuk 1 SPPG (Satuan Pelayanan Pemenuhan Gizi) dalam program MBG di bawah Badan Gizi Nasional. Detail lengkap: `00-PROJECT.md`.

## Baca urutan ini SEBELUM nulis kode apapun

1. `00-PROJECT.md` — overview, role, alur kerja, tech stack.
2. `03-DECISIONS.md` — keputusan FINAL + histori koreksi. **Paling penting, jangan skip.**
3. `01-ARCHITECTURE.md` — struktur schema & alasan desain per modul.
4. `05-STATUS-MODUL.md` — status tiap modul sekarang (schema/seed/API/query/frontend).
5. `04-TODO.md` — urutan kerja berikutnya, ikuti urutannya.
6. `02-PROGRESS.md` — log kronologis, cek paling akhir buat tau "kita lagi di mana".
7. `06-QUERY-REFERENCE.md` — pola query siap pakai (BKU, BP, LPA, SPTJ, BAPSD) — pakai ini sebagai basis, jangan bikin ulang dari nol.
8. `prisma/schema.prisma` — sumber kebenaran teknis, versi v5.6.

## Struktur repo saat ini

```
backend/
  index.js                  # entry point (npm start / npm run dev)
  package.json
  src/
    app.js                  # express app, wiring routes
    lib/prisma.js           # Prisma Client singleton — import ini, jangan `new PrismaClient()` lagi di file lain
    middleware/auth.js       # requireAuth, requireRole — SUDAH JADI, pakai ini di semua route baru
    routes/auth.js           # POST /api/auth/login, GET /api/auth/me — SUDAH JADI, jangan diutak-atik tanpa alasan
  prisma/
    schema.prisma
    seed.js                  # SUDAH JALAN, data master ada di DB lokal
    migrations/
```

## Status saat ini (ringkas — detail di `02-PROGRESS.md`)

- Schema v5.6 **selesai**, sudah di-migrate + di-seed ke PostgreSQL **lokal**.
- **Auth & Seluruh API Backend SELESAI** — Backend routes (Aslap, Mitra, Ahli Gizi, Akuntan, Kepala SPPG, dan Laporan Agregasi) selesai diimplementasikan 100% dan diuji.
- **Frontend SEDANG BERJALAN** — Vite + React + React Router v6 scaffolded. Halaman login, layout shell, modul Aslap (CRUD Penerima Manfaat) dan Mitra (CRUD Harga Bahan Periode) selesai 100%. Halaman Gizi (Menu Harian) sedang dalam pengembangan.

## Pola yang WAJIB diikuti untuk endpoint baru (konsisten sama auth)

```js
// src/routes/<modul>.js
const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("ASLAP", "KEPALA_SPPG"), async (req, res) => {
  // req.user = { sub, username, role, nama } dari JWT
  const data = await prisma.someModel.findMany(/* ... */);
  res.json(data);
});

module.exports = router;
```

Lalu daftarkan di `src/app.js`:
```js
const modulRoutes = require("./routes/<modul>");
app.use("/api/<modul>", modulRoutes);
```

Aturan tambahan:
- Validasi app-layer yang **tidak** ditangani constraint DB (lihat `04-TODO.md` §4, mis. `hariAktif` gak boleh overlap, `Approval.catatan` wajib diisi kalau `DITOLAK`) HARUS dicek eksplisit di handler, jangan diasumsikan aman.
- Error response konsisten: `{ error: "pesan singkat jelas" }`, status code yang sesuai (400 validasi, 401 auth, 403 role, 404 not found, 409 conflict).
- Jangan bikin `new PrismaClient()` baru di file lain — selalu `require("../lib/prisma")`.
- Setiap endpoint yang nulis ke `JurnalTransaksi` wajib manggil `recalcAktualAnggaran` (pola ada di `06-QUERY-REFERENCE.md`) biar `AnggaranHarian.aktual` tetap sinkron.

## Urutan kerja berikutnya (dari `04-TODO.md` §3, sudah dipersempit sesuai status auth selesai)

1. Modul Aslap: `InputPenerimaManfaat` + `InputPenerimaManfaatDetail`, `SekolahKelasDetail`.
2. Modul Mitra: `HargaBahanPeriode`.
3. Modul Ahli Gizi: Menu (Master, Harian, Blok, Item, Bahan, Target Gizi, Organoleptik, Alergi, Pengiriman).
4. Modul Akuntan: RAB/Pembelian, Anggaran, Jurnal, Dokumen Resmi, Daftar Nominatif, Stok.
5. Modul Kepala SPPG: Approval + view-only laporan.
6. Endpoint laporan/agregasi (pakai fungsi dari `06-QUERY-REFERENCE.md` langsung, jangan tulis ulang).

## Aturan kerja tiap sesi

- Kalau nemu ambiguitas/gap baru: **tanya user, jangan asumsi**. Kalau terpaksa asumsi buat lanjut, tandai eksplisit `[ASUMSI]` di kode/komentar dan laporkan ke user di akhir kerjaan.
- Kalau user kasih info baru yang kontradiksi keputusan FINAL lama: tunjukkan konfliknya dulu secara eksplisit sebelum ubah, jangan overwrite senyap.
- Setiap kelar 1 modul: update `02-PROGRESS.md` (centang/tambah baris) dan `05-STATUS-MODUL.md` (ubah status kolom API jadi ✅) — dokumentasi harus selalu mencerminkan kondisi kode terkini, bukan tertinggal.
- Kalau ternyata perlu ubah schema: update juga `01-ARCHITECTURE.md`/`03-DECISIONS.md` dan bikin migration baru (`npx prisma migrate dev --name <deskriptif>`) dari folder `backend`, bukan dari dalam `backend/prisma`.

---

*(Setelah baca semua ini, konfirmasi dulu ke user: sebutkan status terakhir, next-step yang mau dikerjakan sesuai urutan di atas, dan tunggu konfirmasi/prioritas dari user sebelum mulai nulis kode.)*