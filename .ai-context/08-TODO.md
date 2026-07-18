# Daftar Tugas SPPG (Juli 2026)

## A. Sedang Dikerjakan (In Progress)

_Tidak ada tugas aktif saat ini._

---

## B. Tugas Terbuka (Todo)

### 1. [ ] Audit Ahli Gizi: Redesign "Master Menu Mingguan" jadi Kartu Referensi Anggaran
- **Deskripsi**: Menampilkan rincian historis menu mingguan yang disetujui beserta estimasi harganya agar Ahli Gizi memiliki panduan saat menyusun menu agar tidak melebihi pagu harian.
- **Tugas Audit**: Cek endpoint `/gizi/master-menu` untuk melihat ketersediaan data breakdown bahan pokok.
- **Status**: Belum dikerjakan.

### 2. [ ] Audit Ahli Gizi: Granularitas Kendaraan/Mobil vs Realita Excel
- **Deskripsi**: Excel membagi kebutuhan per "Mobil 1/2/3" (grouping custom). Sistem saat ini hanya mendukung `PengirimanHarian` per `jenisPorsi` (Kecil/Besar, max 2 mobil).
- **Tugas Audit**: Tanyakan kepada user apakah butuh pengiriman per Mobil custom atau tetap per porsi sudah cukup.
- **Status**: Belum dikerjakan.

### 3. [ ] Audit Ahli Gizi: Jalur 3B - Apakah Butuh PengirimanHarian?
- **Deskripsi**: Jalur 3B (Balita/Bumil/Busui) tidak memiliki mobil pengantaran di Excel (diambil langsung di posyandu).
- **Tugas Audit**: Cek apakah logic `PengirimanHarian` mewajibkan pengiriman untuk semua jenis menu. Jika iya, buat opsional untuk jalur TIGA_B.
- **Status**: Belum dikerjakan.

### 4. [ ] Transaksi Jurnal gagal "ga sesuai periode"
- **Deskripsi**: Validasi tanggal transaksi harus masuk ke dalam rentang periode aktif.
- **Langkah**: Cek konfigurasi `tanggalMulai` dan `tanggalSelesai` pada Setup Periode saat pengetesan.
- **Status**: Belum dikerjakan.

### 5. [x] Deploy schema migration ke Supabase production (PO 2-Tahap)
- **Deskripsi**: Migrasi schema PO 2-tahap (enum `StatusPO`, field realisasi, field `diterimaOlehId`/`diterimaAt`) sudah verified di lokal, belum deploy ke prod.
- **Langkah**:
  1. Backup data prod: `SELECT COUNT(*) FROM "TransaksiPembelian";`
  2. Buat backfill SQL untuk `createdById` jika ada data lama (set ke userId akuntan pertama).
  3. Jalankan `npx prisma migrate deploy` ke Supabase prod dengan `DATABASE_URL` pooler.
- **Status**: ✅ **SELESAI 2026-07-17** — Migrasi deploy ke Supabase prod berhasil. Data test dummy (8 TransaksiPembelian + Supplier) dibersihkan manual. CATATAN: `DATABASE_URL` runtime (Railway) WAJIB port 6543 + `?pgbouncer=true`, migration WAJIB port 5432 tanpa pgbouncer.

### 6. [ ] Code-splitting bundle size (Belum Urgent)
- **Deskripsi**: Peringatan build size di Vite (>500kB).
- **Langkah**: Optimalkan bundle size dengan `React.lazy` atau penataan `manualChunks`.
- **Status**: Belum dikerjakan.

### 7. [x] PO 2-Tahap: Akuntan Inisiasi → Mitra Realisasi → Verifikasi Aslap ✅
- **Mekanisme**: Akuntan bikin PO → Mitra checklist Tahan/Beli per item
  (partial-save, auto-flip DIREALISASI kalau semua item terisi) →
  Aslap verifikasi fisik (gate status DIREALISASI, no partial).
- **Tambah Supplier On-the-fly**: Modal "+ Baru" di AkuntanPoPage.jsx
  — POST /api/akuntan/supplier → auto-refresh dropdown + auto-select
  supplier baru.
- **Prefill Jurnal dari PO**: Dropdown "Isi dari PO" di
  JurnalTransaksiPage.jsx — GET /api/akuntan/jurnal-transaksi/prefill/:id
  — isi draft nominal dari subtotalRealisasi PO, Akuntan submit manual
  setelah cek nota fisik.
- **qtyDiterima**: Field di schema tetap ada tapi tidak dipakai (YAGNI)
  — Aslap approve per-dokumen, bukan per-item.
- **Fix tambahan**: Transaction timeout dinaikkan ke 15000ms di 3 endpoint
  jurnal (POST/PUT/DELETE) — bug lama ketemu pas testing.
- **Status**: ✅ **SELESAI 2026-07-18** — Seluruh sub-tugas (migration
  audit trail, flip-logic, prefill jurnal, FE grouping, gate Aslap)
  sudah diimplementasi, dites via production endpoint, dan diclose.

---

## C. Arsip Tugas Selesai (Completed)

- [x] **Redesign Alur PO 2-Tahap (Full Stack)**: Implementasi lengkap alur DIAJUKAN → DIREALISASI → DITERIMA.
  - Schema: enum `StatusPO`, field `qtyRealisasi/hargaSatuanRealisasi/subtotalRealisasi`, field `diterimaOlehId/diterimaAt`, relasi `AkuntanBuatPO` & `AslapTerimaPO` pada model `User`.
  - Backend: `POST /api/akuntan/po`, `PUT /api/mitra/po/:id/realisasi`, `PUT /api/aslap/po/:id/approve`, `GET /mitra/po/list` (multi-role), deprecated `POST /api/mitra/po` → 410 Gone.
  - Frontend: `AkuntanPoPage` (inisiasi + cetak PO+realisasi), `MitraPoPage` (list + modal realisasi), `AslapPoPage` (list + modal approve). Routing + sidebar links di `App.jsx` & `Layout.jsx`.
- [x] **Tugas 1: Audit & Fix Kode Akun COA**: Penyelarasan akun 2120 (Dana Operasional - DANA), 2121 (Biaya Insentif - BIAYA), 2122 (Biaya Lainnya - BIAYA), dan 2123 (Biaya Operasional - BIAYA) ke database Supabase.
- [x] **Tugas 2: Audit Field "Catatan Pengeluaran"**: Mengonfirmasi bahwa data `JurnalTransaksi` tidak memerlukan field catatan tambahan selain `uraian`.
- [x] **Tugas 3: Judul & Layout PDF BKU**: Mengubah judul PDF BKU menjadi `"BUKU KAS UMUM"` dan memperbaiki conflict margin ganda secara global.
- [x] **Tugas 4: Audit BP per Kategori Dana vs Akun Tunggal**: Memastikan Buku Pembantu menyaring strictly per `akunId` secara spesifik.
- [x] **Rename seed_old.js & update package.json**: Mengubah nama seed lama ke `seed.js` dan menyesuaikan run command.
- [x] **Laporan Resume Penerimaan-Pengeluaran (LR)**: Integrasi dropdown baru, reuse endpoint LPA dengan parameter `isLr=true`, dan penyesuaian layout PDF.
- [x] **DatePicker format DD/MM/YYYY**: Update display format ke locale `id-ID`.
- [x] **Format Rupiah di Setup Periode**: Masking nominal rupiah pada form input `anggaranAlokasi` & `totalDanaDiterima` di frontend.
- [x] **Fitur Delete di Jurnal Transaksi**: Penambahan tombol hapus transaksi ledger beserta pemicu recalculate harian.
- [x] **Tooltip "Turunan Periode"**: Penggantian copy teks tooltip penjelas periode aktif.
- [x] **Dana Operasional gabung 1 akun (2120)**: Pemecahan akun menjadi 2120 dan 2122.
- [x] **`totalDanaDiterima` Setup Periode**: Pembersihan input manual dari form setup periode, beralih ke kalkulasi live aggregate SUM transaksi masuk (DANA) di BKU.
- [x] **RAB Harian Kosong**: Penambahan banner informatif bahwa transaksi bahan makanan diinput langsung oleh Mitra melalui PO.
- [x] **Isi Cepat Bantuan Pemerintah (BanPer)**: Shortcut otomatis pengisian formulir jurnal masuk.
