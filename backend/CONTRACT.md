# Kontrak Backend

Beda sama `07-API-CONTRACT.md` (itu janji BENTUK DATA ke Gemini). Ini janji
CARA NULIS KODE antara Claude (fondasi) & DeepSeek (logika bisnis) — supaya
kode gak keliatan ditulis 2 gaya berbeda pas digabung.

AI yang baca file ini WAJIB ikutin, jangan improvisasi gaya sendiri walau
menurutmu "lebih rapi".

---

## Struktur folder (JANGAN diubah, cuma diisi)

```
src/
├── app.js              # entry point, daftar semua route
├── lib/                # utilitas lintas sektor (DB client, JWT). isinya dikit.
├── middleware/          # auth, dst
└── routes/              # 1 file = 1 resource/sektor
```

Gak ada `controllers/`, `services/`, `repositories/` terpisah — route
langsung panggil Prisma. Jangan nambah layer ini sendiri walau "best
practice", scope project belum butuh (lihat 03-DECISIONS.md filosofi
ponytail: minimal viable, bukan maksimal arsitektur).

## Penamaan file & route

- File route: `kebab-case.js`, nama = nama resource di URL
  (`data-penerima.js` → `/api/data-penerima`)
- 1 file route cuma isi endpoint yang SEKTORNYA sama (jangan gabung
  endpoint Mitra & Ahli Gizi dalam 1 file walau kelihatan related)

## Format response — WAJIB persis ini, gak boleh variasi

Sukses:
```js
res.status(200).json({ success: true, data: /* sesuai 07-API-CONTRACT.md */ });
```
Gagal:
```js
res.status(400 | 401 | 403 | 404 | 500).json({ success: false, error: "pesan singkat" });
```

Status code HARUS diisi manual tiap response, jangan andalkan default
Express (200 diam-diam kalau lupa `.status()`).

| Situasi | Code |
|---|---|
| Sukses | 200 |
| Validasi input gagal | 400 |
| Token gak ada/invalid/expired | 401 |
| Role gak berwenang | 403 |
| Resource gak ketemu | 404 |
| Error tak terduga | 500 |

## Auth di tiap route

Pola wajib, urutan middleware gak boleh dibalik:
```js
router.post('/endpoint', requireAuth, requireRole('mitra'), async (req, res) => { ... });
```
- `requireAuth` selalu paling depan (kecuali `/auth/login`)
- `requireRole(...)` cuma dipasang kalau endpoint memang dibatasi role
  tertentu — cek tabel hak akses di `01-ARCHITECTURE.md`
- User yang login ada di `req.user` = `{ id, role, nama }`, jangan query
  ulang ke DB cuma buat ambil role

## Prisma — aturan pakai

- Import dari `../lib/prisma` (singleton), JANGAN `new PrismaClient()` di
  file route manapun
- Field Decimal dari Prisma balik sebagai object `Decimal`, bukan number
  polos — WAJIB `.toNumber()` (atau `Number(...)`) sebelum masuk response
  JSON, karena kontrak API janjiin "angka biasa" ke Gemini
- Nama kolom DB pakai snake_case (`@map`), tapi di kode JS/Prisma Client
  tetap pakai camelCase sesuai nama field di schema — jangan tulis nama
  kolom mentah

## Validasi input

- Validasi manual di awal tiap handler (cek field wajib ada, tipe benar),
  gak pakai library validasi (zod/joi/dst) — nambah dependency buat
  validasi yang sebenarnya simpel, skip dulu sampai kebutuhan sungguh
  kompleks
- Kalau gagal validasi → langsung `return res.status(400)...`, jangan
  lanjut proses

## Try-catch

- Wajib di setiap handler yang manggil Prisma (record not found, FK
  constraint gagal, dst bisa throw)
- Kalau errornya "resource gak ketemu" → tangkap spesifik, balikin 404
- Kalau gak tau kenapa, biarin ke error handler global di `app.js` → 500,
  jangan bikin try-catch generik yang nelen error diam-diam

## Yang TIDAK boleh dilakukan tanpa izin user

- Ubah `prisma/schema.prisma` (HANYA Claude, dan HARUS lewat review —
  lihat 05-STATUS-MODUL.md)
- Ubah bentuk request/response yang sudah ada di `07-API-CONTRACT.md`
- Nambah dependency baru (library) tanpa disebut di sini atau ditanya dulu
- Nambah layer arsitektur baru (services, DTO, dst) atas inisiatif sendiri

## Kalau nemu endpoint yang belum ada kontraknya

Jangan asumsikan bentuk sendiri. Tulis dulu di `07-API-CONTRACT.md`,
beri tahu user, baru implementasi.
