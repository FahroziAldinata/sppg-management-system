# 02 — Progress

Update tiap ada milestone. Urutan kronologis, terbaru di bawah.

## Selesai

- [x] Spek workflow Aslap (input penerima manfaat, laporan periode/bulan, jumlah per kelas) — dikumpulkan lewat chat manual + screenshot.
- [x] Spek workflow Ahli Gizi (menu, kebutuhan gizi, kebutuhan belanja bahan, alergi, pengiriman/mobil) — dari `MENU_12_17I__JANUARI.xlsx`.
- [x] Spek workflow Akuntan (saldo buku, anggaran, transaksi, BKU/BP, dokumen resmi, daftar nominatif, stok barang) — dari wawancara + `LAPORAN_ASLAP_BARU.xlsx`.
- [x] `schema.prisma` v1 → v5.2 — 40+ model, general ledger double-entry, modul menu penuh, modul stok terkonfirmasi (bukan spekulatif), modul pengiriman (Kendaraan), modul alergi, taksonomi kategori disatukan (13 kategori resmi BGN).
- [x] Environment lokal disiapkan: Node.js project di `D:\Project\Sistem\Sistem_SPPG\backend`, PostgreSQL 18 di-install lokal, DBeaver Community di-install, Prisma di-pin ke v6 (v7 butuh restrukturisasi `prisma.config.ts` + driver adapter — ditunda).
- [x] `npx prisma migrate dev --name init` sukses ke PostgreSQL lokal. Semua tabel v5.2 sudah ada di `localhost:5432/postgres`. Prisma Client ter-generate.
- [x] Schema iterasi v5.3 → v5.6: gap penerima manfaat, stok, pengiriman, alergi, ledger, LPA/SPTJ/BAPSD, query BKU/BP/LR semua ditutup — lihat `03-DECISIONS.md`.
- [x] `prisma/seed.js` dibuat & dijalankan (`npx prisma migrate dev --name v5_full_update` lalu `npx prisma db seed`) — data master (13 KategoriPenerima, 9 KelompokUmurMenu, Akun, BatasHargaPorsi, Kendaraan, User per role, Sekolah contoh, Periode+SetupLembaga) sudah masuk DB lokal.
- [x] **Auth selesai** — `src/middleware/auth.js` (`requireAuth`, `requireRole`, JWT stateless) + `src/routes/auth.js` (`POST /api/auth/login`, `GET /api/auth/me`) + `src/lib/prisma.js` (Prisma Client singleton) + `src/app.js` + `index.js`. Sudah dites jalan di lokal.
- [x] **Modul Aslap selesai** — API CRUD untuk `InputPenerimaManfaat` (dengan validasi overlap hariAktif per periode, PostgreSQL row-level lock `SELECT FOR UPDATE` pada Periode untuk menjamin atomisitas konkuren penuh, dan findOrCreate Sekolah/Posyandu baru) serta CRUD `SekolahKelasDetail` (dengan validasi unique constraint dan findOrCreate Sekolah baru) telah diuji berhasil. Silakan cek test integrasi di `backend/src/routes/__tests__/aslap.js`.
- [x] **Modul Mitra selesai** — API CRUD untuk `HargaBahanPeriode` (dengan unique constraint validation dalam transaction, serta handling error P2002/P2025 secara presisi) dan read-only `BahanPokok` selesai diuji berhasil. Silakan cek test integrasi di `backend/src/routes/__tests__/mitra.js`.
- [x] **Modul Ahli Gizi — MenuHarian & MenuHarianBlok selesai** — API CRUD untuk `MenuHarian` (amplop harian) dan `MenuHarianBlok` (per tanggal + kelompok umur) dengan validasi rentang tanggal periode (FINAL, terkonfirmasi), unique constraint validation, transactional rollback, dan integration tests.
- [x] **Modul Ahli Gizi — Menu Lengkap selesai** — API CRUD untuk `MenuItem`, `MenuItemBahan` (gizi manual, berat kotor & total harga formula), `MenuTargetGizi` (1:1 blok), `MenuOrganoleptik` (1:1 blok), `AlergiCatatan` (1:many blok), `Kendaraan`, `PengirimanHarian` (dengan validasi kendaraan aktif [ASUMSI], FK check P2003, dan unique `[menuHarianId, jenisPorsi]` P2002), serta `MasterMenuMingguan` (dengan createdById menggunakan `req.user.sub`). Pengujian cascade delete (MenuHarian -> blok, approval, pengiriman) & (MenuHarianBlok -> target gizi, organoleptik, alergi, menuItem) lulus 100%.
- [x] **Modul Akuntan — RAB Harian & Anggaran Harian selesai** — API CRUD untuk `RabHarian` (dengan manual cascade delete, block on linked JurnalTransaksi, and subtotal rounding) dan `AnggaranHarian` (dengan constraint check, BatasHargaPorsi validation, deduplikasi kategori, block on non-zero aktual, dan database cascade delete) selesai diimplementasikan.
- [x] **Modul Akuntan — JurnalTransaksi, DokumenResmi (LPA/SPTJ/BAPSD), & DaftarNominatifUpah selesai** — Implementasi POST, GET, PUT (Opsi B), DELETE untuk `JurnalTransaksi` dengan validasi akun aktif dan normalisasi timezone. CRUD lengkap `DokumenResmi` (live generator) & `DaftarNominatifUpah` (+ detail harian cascade delete). Semua `createdById` menggunakan `req.user.sub`.

## Sedang jalan / berikutnya

- [x] **Modul Akuntan — Stok dimulai** — POST `SaldoAwalBarang` (P2002 untuk unique, validasi `bahanPokok.aktif`) selesai. POST `MutasiStok` jenis MASUK selesai (validasi field kondisional ketat: `supplierId`+`hargaBeli` wajib, `kelompokPenerima` diblokir).
- [ ] MutasiStok jenis KELUAR — validasi `kelompokPenerima` wajib, `supplierId`/`hargaBeli` diblokir, [ASUMSI] validasi saldo cukup menunggu keputusan user.
- [ ] Sisa API Modul Akuntan (query harga beli terbaru MAX tanggal, dsb.)
- [ ] Modul Kepala SPPG (Approval harian MenuHarian dan RabHarian).

- [ ] Frontend (React/Vite) — **belum dimulai**, tunggu semua endpoint modul inti selesai.

## Belum dikerjakan sama sekali

- Query laporan disambungkan ke endpoint (fungsi sudah ada di `06-QUERY-REFERENCE.md`, belum dipasang ke route).
- Frontend seluruhnya.
- Deployment (Render/Vercel) + keputusan final DB prod (lokal vs Supabase).
- `cors` middleware (baru perlu kalau frontend beda origin mulai manggil API).
