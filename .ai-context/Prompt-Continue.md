# Handover Prompt — Redesign Layout 4 Dokumen Resmi (LPA, SPTJ, BAPSD, BKU)

Sesi sebelumnya telah menyelesaikan seluruh implementasi HariLibur model dan filtrasinya pada Nominatif Upah Harian. Tugas berikutnya adalah melanjutkan rencana redesign layout visual untuk 4 dokumen resmi (LPA, SPTJ, BAPSD, BKU).

## 1. Closed in Previous Session
- [x] **HariLibur & Filter Nominatif Upah** — Model HariLibur (global, filter-only), 3 endpoint CRUD (Akuntan), form Kelola Hari Libur di NominatifUpahPage.jsx, filter Minggu+libur di addUpahDetail, ConfirmDialog migrasi utk delete. Teruji manual (create/delete/refresh persist).
- [x] **Toast-ify Alert** — Mengubah 3 alert() native pada fungsi `addUpahDetail` menjadi `toast.error()`.
- [x] **ConfirmDialog Migration** — Migrasi `window.confirm()` native ke komponen `<ConfirmDialog>` pada penghapusan Hari Libur di `NominatifUpahPage.jsx`.

## 2. Next Session Task
Melakukan redesign layout visual formal dan premium untuk 4 dokumen resmi (LPA, SPTJ, BAPSD, BKU) sesuai dengan pedoman pada berkas:
👉 [08-PLAN-LAYOUT-DOKUMEN.md](file:///e:/Project/Sistem_SPPG/.ai-context/08-PLAN-LAYOUT-DOKUMEN.md)

### Urutan Pengerjaan:
1. Mulai dari **LPA** terlebih dahulu (karena memiliki field data paling lengkap).
2. Lakukan migrasi pola layout tersebut ke dokumen lainnya secara berurutan: **SPTJ** -> **BAPSD** -> **BKU** -> **Nominatif Upah** (dokumen ke-5, rancang layout-nya saja karena data sudah lengkap).

## 3. Blocking Questions & Ambiguitas
Sebelum memulai pengerjaan, periksa apakah pertanyaan pada section **"Pertanyaan & Ambiguitas"** di [08-PLAN-LAYOUT-DOKUMEN.md](file:///e:/Project/Sistem_SPPG/.ai-context/08-PLAN-LAYOUT-DOKUMEN.md#L131) sudah dijawab oleh user atau masih menunggu keputusan:
- Desain Gambar Logo Kop Surat (Placeholder / Garuda).
- Teks Keterangan Statis LPA Section II.
- Tampilan baris penerimaan pada Tabel Transaksi BKU.
