# Daftar Tugas SPPG (Juli 2026)

## A. Batch Lanjutan (Instruksi Demo & Audit Keuangan)

### 1. [x] Tugas 1 — AUDIT & Fix Kode Akun COA (Kritis, Prioritas Utama)
- **Deskripsi**: Menyesuaikan mapping chart of accounts (COA) agar selaras dengan kebutuhan akuntan:
  - `2120` = Dana Operasional (DANA) - *Diubah dari Biaya Operasional ke Dana Operasional, kategori OPERASIONAL*
  - `2121` = Biaya Insentif Fasilitas (BIAYA) - *Sudah benar, jangan diubah*
  - `2122` = Biaya Lainnya (BIAYA, kategori baru, `kategoriDana: null`)
  - `2123` = Biaya Operasional (BIAYA, kategori `OPERASIONAL`)
- **Status**: Selesai. Database produksi Supabase telah diperbarui melalui seeding tanpa perlu mengubah skema enum di Prisma schema.

### 2. [ ] Tugas 2 — Audit field "Catatan Pengeluaran" di Jurnal Transaksi
- **Deskripsi**: Periksa model `JurnalTransaksi` di `schema.prisma` untuk melihat apakah ada field catatan/keterangan tambahan di luar field `uraian` yang sudah ada.
- **Tugas Audit**: Laporkan ketersediaan field ini untuk menentukan langkah penyesuaian formulir ke depannya.

### 3. [x] Tugas 3 — Fix judul & layout PDF BKU
- **Deskripsi**: Mengganti judul dokumen PDF BKU dari `"Catatan Pengeluaran Bulanan"` menjadi `"BUKU KAS UMUM"` agar sesuai dengan laporan resmi.
- **Status**: Selesai. Aturan `@page` di `shared.js` juga telah diselaraskan agar menghilangkan margin ganda yang menyebabkan layout pecah.

### 4. [ ] Tugas 4 — Audit BP per kategoriDana vs per akunId tunggal
- **Deskripsi**: Periksa halaman dan endpoint `/laporan/bp` (Buku Pembantu) untuk mengetahui apakah filter pencarian/kalkulasi saat ini hanya mengambil satu akun secara spesifik (`akunId` tunggal), atau apakah ada mekanisme untuk menampilkan gabungan akun DANA + BIAYA sekaligus (seperti format Excel yang menggabungkan Dana Bahan Baku & Biaya Bahan Baku).
- **Tugas Audit**: Laporkan alur behavior saat ini sebelum melakukan perubahan logika apa pun.

### 5. Catatan Desain (Referensi Masa Depan)
> [!NOTE]
> Struktur menu/sidebar navigasi tidak perlu menduplikasi struktur sheet Excel secara 1:1. Yang paling penting adalah alur kerja (workflow) terasa familier dan intuitif bagi Akuntan, sehingga pengelompokan menu yang serumpun/berhubungan lebih diprioritaskan dibandingkan sekadar kesamaan nama sheet.

---

## B. Tugas Lainnya / Terbuka

### 0. [ ] Alur PO 2-Tahap: Akuntan Inisiasi → Mitra Realisasi → Verifikasi
Mekanisme dikonfirmasi user (2026-07-17):
1. Akuntan bikin TransaksiPembelian (PO) — qty bahan diambil dari kebutuhan Ahli Gizi (Kebutuhan Belanja Bahan query), utk 1 hari.
2. PO ditujukan ke Mitra (Supplier).
3. Mitra (role MITRA existing, TIDAK ADA role baru — "admin mitra" cuma istilah operasional lapangan) input REALISASI: apa aja & berapa yg beneran dibeli dari PO itu.
4. Verifikasi tahap 1: Akuntan bandingin data PO (diminta) vs realisasi (dibeli) dari Mitra.
5. Verifikasi tahap 2: fisik gudang — Aslap cek fisik barang datang, tandain kurang/cukup. Kalau kurang → perlu notify Mitra kirim ulang.

GAP SCHEMA (blm dikerjakan, cek kode dulu sebelum ubah apapun):
- TransaksiPembelianItem cuma 1 set qty/hargaSatuan/subtotal — BELUM bisa bedain "diminta (PO)" vs "direalisasi (dibeli)". Kemungkinan butuh qtyDiminta vs qtyRealisasi, atau tabel terpisah — BUTUH DISKUSI, jangan migrasi sebelum liat MitraPoPage.jsx & endpoint POST TransaksiPembelian existing dulu.
- Siapa create TransaksiPembelian sekarang (Akuntan/Mitra) di kode existing — kontradiksi dgn dok lama (MitraPoPage nunjuk Mitra), perlu dicek verbatim dulu.
- ValidasiStok pelaksana: dikonfirmasi user = Aslap (bukan Akuntan spt asumsi 03-DECISIONS.md) — perlu update decision log kalau jadi dieksekusi.
- Belum ada field/status "kurang, perlu kirim ulang" utk notify Mitra.

### 1. [ ] Transaksi Jurnal gagal "ga sesuai periode"
- **Deskripsi**: Validasi tanggal jurnal transaksi wajib berada dalam rentang tanggal `Periode` aktif. 
- **Langkah**: Cek nilai `tanggalMulai` dan `tanggalSelesai` pada data Setup Periode yang digunakan saat pengujian (ada kemungkinan data periode salah setup saat demo).

### 2. [ ] Code-splitting bundle size (Belum Urgent)
- **Deskripsi**: Vite build warning mengenai chunk size >500kB.
- **Langkah**: Implementasikan `React.lazy` per halaman role atau konfigurasikan `manualChunks` di `vite.config.js` jika performa memburuk.

---

## C. Arsip Tugas Selesai (Completed)

- [x] Rename backend/prisma/seed_old.js → seed.js + update package.json prisma.seed, verified npx prisma db seed jalan normal.
- [x] **Laporan Resume Penerimaan-Pengeluaran (LR)**: Integrasi dropdown baru, reuse endpoint LPA dengan parameter `isLr=true`, dan penyesuaian layout PDF (menyembunyikan nomor dokumen).
- [x] **DatePicker format DD/MM/YYYY**: Update display format ke locale `id-ID`.
- [x] **Format Rupiah di Setup Periode**: Masking nominal rupiah pada form input `anggaranAlokasi` & `totalDanaDiterima` di frontend.
- [x] **Fitur Delete di Jurnal Transaksi**: Penambahan tombol hapus transaksi ledger beserta pemicu otomatis untuk fungsi recalculate anggaran harian (`recalcAktualAnggaran`).
- [x] **Tooltip "Turunan Periode"**: Penggantian copy teks tooltip penjelas periode aktif.
- [x] **Dana Operasional gabung 1 akun (2120)**: Pemecahan akun menjadi 2120 (Biaya Operasional - BIAYA) dan 2122 (Dana Operasional - DANA).
- [x] **`totalDanaDiterima` Setup Periode**: Pembersihan input manual dari form setup periode, beralih ke kalkulasi live aggregate SUM transaksi masuk (DANA) di BKU.
- [x] **RAB Harian Kosong**: Penambahan banner informatif yang menerangkan bahwa transaksi bahan makanan diinput langsung oleh Mitra melalui Purchase Order.
- [x] **Isi Cepat Bantuan Pemerintah (BanPer)**: Implementasi shortcut otomatis pengisian formulir jurnal masuk untuk ketiga kategori dana utama.
