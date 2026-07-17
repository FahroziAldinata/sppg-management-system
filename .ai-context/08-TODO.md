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

### B. Perlu Klarifikasi ke Akuntan Asli (jangan diubah dulu sebelum dikonfirmasi)

- [ ] **Dana Operasional gabung 1 akun (2120)?**
  - Ini keputusan FINAL v5.5, udah dikonfirmasi. Tapi user demo protes ulang.
  - Tanya akuntan: "mau tetep 1 akun gabungan Operasional, atau dipisah Dana vs Biaya kayak Bahan Baku (2110/2190)?"
  - Kalau jawabannya berubah → catat sebagai revisi v5.23 di `03-DECISIONS.md`, bukan bug.

- [ ] **`totalDanaDiterima` di Setup Periode — snapshot manual atau auto-link ke Jurnal?**
  - Tanya akuntan: mau field ini dihapus dari form Setup (kosongin di awal periode) dan auto-terhitung dari `SUM` jurnal transaksi kategori dana masuk?
  - Kalau ya → perubahan schema/logic, bukan UI — perlu direncanain terpisah, jangan buru-buru.

---

### C. Perlu Audit Dulu (agent cek, sebelum eksekusi)

- [ ] **RAB Harian kosong, ga bisa input transaksi**
  - Kemungkinan: user bingung RAB Harian (RENCANA harian → approval Kepala) vs Jurnal Transaksi (REALISASI/pembelian aktual). Dua hal beda.
  - Agent audit dulu: apakah form RAB Harian render field lengkap tapi user ga paham, atau ada field yang ke-skip/gagal muncul?
  - Laporkan screenshot/struktur form sebelum disimpulkan bug atau UX-confusion.

- [ ] **Transaksi Jurnal gagal "ga sesuai periode"**
  - Validasi v5.8/v5.11 jalan sesuai desain (tanggal jurnal wajib dalam rentang Periode).
  - Cek dulu `tanggalMulai`/`tanggalSelesai` di Periode yang dipakai testing — kemungkinan besar bukan bug, Setup Periode-nya salah isi pas demo.
  - Perbaiki data Setup Periode dulu, baru test ulang Jurnal.

- [ ] **"Bantuan Pemerintah" sebagai kategori dana masuk terpisah**
  - Audit dulu: cek Akun tipe DANA yang ada (kode 2110/2130/2120 dst).
  - Tanya akuntan: "Bantuan Pemerintah" itu satu-satunya sumber dana masuk, atau perlu tag/kategori sendiri?
  - Kalau perlu akun baru di COA → nambah kode akun, butuh approval akuntan sebelum di-seed.
