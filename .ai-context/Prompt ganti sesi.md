# Handoff Modul Akuntan & Laporan SPPG (Juli 2026)

Berikut adalah status pekerjaan dan instruksi sinkronisasi untuk sesi berikutnya:

## 1. Pekerjaan yang Selesai di Sesi Ini:
* **Tugas 1 (Fix COA Seed & Rename)**: 
  - Mengubah pemetaan COA pada `seed.js` (kode `2120` jadi Dana Operasional, `2122` jadi Biaya Lainnya dengan `kategoriDana: null`, dan menambah `2123` untuk Biaya Operasional).
  - Mengubah nama file dari `seed_old.js` menjadi `seed.js` dan menyesuaikan `"prisma.seed"` di `package.json`.
  - Berhasil men-seed data terbaru ke database Supabase menggunakan `npx prisma db seed`.
* **Tugas 3 (Fix PDF BKU)**:
  - Mengubah judul PDF BKU menjadi `"BUKU KAS UMUM"`.
  - Memperbaiki `@page { margin: 0; }` pada `shared.js` untuk mengatasi bug margin ganda PDF BKU & LR.

## 2. Hasil Audit untuk Ditindaklanjuti:
* **Tugas 2 (Field Catatan Jurnal)**:
  - Telah diperiksa bahwa skema `JurnalTransaksi` tidak memiliki field catatan tambahan selain `uraian` (dan `tagPengeluaran`). Rekomendasi: Gunakan `uraian` saja.
* **Tugas 4 (Buku Pembantu / BP)**:
  - Telah di-audit bahwa behavior halaman/endpoint BP saat ini strictly memuat satu per satu `akunId` secara tunggal, tidak ada aggregation DANA + BIAYA sekaligus di satu tabel.

## 3. Langkah Berikutnya (Next Agent Tasks):
1. **Verifikasi Fungsionalitas COA Baru**:
   - Pastikan transaksi jurnal dengan akun baru (`2120`, `2122`, `2123`) dapat diinput dengan benar di frontend (`JurnalTransaksiPage`).
   - Verifikasi apakah penghitungan aggregate total/aktual anggaran di laporan BKU, LPA, dan LR sudah mencakup akun `2123` (Biaya Operasional) dan mengabaikan `2122` (Biaya Lainnya) jika kategori dana-nya `null`.
2. **Review Bugs & Feedback User**:
   - Tangani item terbuka di `08-TODO.md` jika user melaporkan bug terkait transaksi jurnal "ga sesuai periode".
