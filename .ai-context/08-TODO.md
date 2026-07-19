# Daftar Tugas SPPG (Juli 2026)

## A. Sedang Dikerjakan (In Progress)

_Tidak ada tugas aktif saat ini._

---

## B. Tugas Terbuka (Todo)

_Tidak ada tugas terbuka saat ini._

---

## C. Arsip Tugas Selesai (Completed)
- [x] **Gabung 9 Halaman Laporan Jadi 1 (Dropdown Selector) — SELESAI 2026-07-19**: 6 laporan (BKU, BP, StockBarang, KebutuhanBelanjaBahan, LaporanPerPeriode, LaporanPerBulan) disatukan ke dalam `LaporanPage.jsx` dengan sinkronisasi URL path. 3 laporan resmi dipindahkan ke generator tersendiri.
- [x] **Pisah Halaman Dokumen Resmi dari Laporan BKU — SELESAI 2026-07-19**: Penerbitan Dokumen Resmi (LPA, SPTJ, BAPSD, LR) dipisahkan ke `DokumenResmiPage.jsx` dengan tabbed view, validasi data, deletion (Batal Terbit), dan modal PDF viewer.
- [x] **Layout Cetak PO Gabungan Sesuai Format Asli**: Redesign kop surat (logo + token warna), tabel header/total token warna, footer Mitra SPPG, field Kepada/Alamat/Waktu/PM/Menu sesuai referensi Excel. TODO #3 CLOSED.
- [x] **Guardrail Harga Porsi Real-time di Menu Harian (Ahli Gizi)**: Integrasi backend-frontend untuk membatasi anggaran porsi (KECIL/BESAR) real-time di UI `MenuHarianPage.jsx` beserta optimasi visual accordion kelompok umur, collapse empty menu components, dan sticky workspace header.
- [x] **PO 2-Tahap (Akuntan→Mitra→Aslap)**: Inisiasi PO oleh Akuntan, partial-save realisasi oleh Mitra (auto-flip DIREALISASI), approval Aslap, modal tambah supplier baru, dan prefill jurnal transaksi.
- [x] **Jalur 3B PengirimanHarian Opsional**: Mengonfirmasi bahwa model pengiriman bersifat opsional secara teknis di database dan API (relasi 0..*).
- [x] **Validasi Periode JurnalTransaksi**: Tanggal transaksi divalidasi strictly masuk ke dalam rentang periode aktif.
- [x] **Deploy Schema Migration PO 2-Tahap**: Migrasi schema PO 2-tahap (`20260717164456_po_item_audit_trail` dkk) berhasil di-deploy ke Supabase prod.
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
- [x] **Konversi Satuan Hitung ke KG**: Badge referensi read-only di RAB Harian, tidak auto-fill QTY manual (sesuai temuan audit Excel: Final≠QTY manual).
- [x] **Gabung RAB Harian + Anggaran Harian**: Merge dua halaman jadi satu dengan tab RAB/Anggaran. Route `/akuntan/anggaran-harian` render komponen yang sama, default tab sesuai path. Sidebar & dashboard link tetap berfungsi.
