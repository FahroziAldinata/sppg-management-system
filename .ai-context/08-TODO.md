## Code-splitting bundle size (belum urgent)

- Vite build warning: ada chunk >500kB minified (pre-existing sejak awal,
  bukan dari cleanup unused-files 2026-07-15).
- Fix: `React.lazy` per halaman role (Aslap/Mitra/Gizi/Akuntan/Kepala) atau
  `manualChunks` di `vite.config.js`.
- Prioritas: rendah. Kerjakan kalau ada bukti nyata loading lambat di
  lapangan (terutama Aslap pakai koneksi HP), bukan preventif.
- Scope: refactor import/routing, BUKAN bagian audit file gak kepake.

---

## Revisi Sistem — Feedback Demo

### A. Fix UI Cepat (langsung kerjain, ga perlu diskusi)

- [x] **DatePicker: format DD/MM/YYYY**
  - Cek `DatePicker.jsx`, ganti format display ke locale `id-ID`.

- [x] **Format Rupiah di Setup Periode** — `anggaranAlokasi` & `totalDanaDiterima`
  - Pakai helper `formatRupiah` dari `shared.js` (udah ada).
  - Reuse ke form input sebagai mask input (bukan cuma display).

- [x] **Fitur Delete di tabel Jurnal Transaksi**
  - Tambah tombol Hapus + dialog konfirmasi.
  - Panggil endpoint `DELETE /jurnal-transaksi/:id` (cek dulu di backend, kemungkinan udah ada).
  - ⚠️ **Wajib**: setelah delete, panggil ulang `recalcAktualAnggaran` biar `AnggaranHarian.aktual` ga nyangkut angka lama.

- [x] **Tooltip/label "Turunan Periode" → ganti copy**
  - Teks baru: `"Periode aktif yang dipilih (tanggal transaksi harus dalam rentang ini)"`
  - Cari di komponen dropdown periode shared, ganti copy-nya.

---

- [x] **Dana Operasional gabung 1 akun (2120)?**
  - Pemecahan selesai: Akun 2120 diubah menjadi "Biaya Operasional" (BIAYA) dan Akun 2122 baru ditambahkan sebagai "Dana Operasional" (DANA).

- [x] **`totalDanaDiterima` di Setup Periode — snapshot manual atau auto-link ke Jurnal?**
  - Auto-SUM selesai: Field dihapus dari setup form frontend, dan diganti kalkulasi live SUM JurnalTransaksi tipe DANA di BKU.

---

### C. Perlu Audit Dulu (agent cek, sebelum eksekusi)

- [x] **RAB Harian kosong, ga bisa input transaksi**
  - Penambahan banner penjelasan di halaman RabHarianPage sudah selesai (transaksi PO Bahan Makanan diinput oleh Mitra).

- [ ] **Transaksi Jurnal gagal "ga sesuai periode"**
  - Validasi v5.8/v5.11 jalan sesuai desain (tanggal jurnal wajib dalam rentang Periode).
  - Cek dulu `tanggalMulai`/`tanggalSelesai` di Periode yang dipakai testing — kemungkinan besar bukan bug, Setup Periode-nya salah isi pas demo.
  - Perbaiki data Setup Periode dulu, baru test ulang Jurnal.

- [x] **"Bantuan Pemerintah" sebagai kategori dana masuk terpisah**
  - Penyelesaian selesai: Shortcut shortcut "Isi Cepat BanPer" telah ditambahkan ke JurnalTransaksiPage.

- [x] **Laporan Resume Penerimaan-Pengeluaran (LR)**
  - Pembuatan laporan LR selesai dengan menggunakan reuse endpoint LPA (tanpa field input Nomor Dokumen).

