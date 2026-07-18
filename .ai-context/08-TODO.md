# Daftar Tugas SPPG (Juli 2026)

## A. Sedang Dikerjakan (In Progress)

_Tidak ada tugas aktif saat ini._

---

## B. Tugas Terbuka (Todo)

### 1. [ ] Buka Kembali CRUD MasterMenuMingguan + Prefill ke Menu Harian
- **Deskripsi**: CRUD MasterMenuMingguan sebelumnya ditutup (410, read-only historis). Keputusan dibalik — dikonfirmasi via audit Excel asli (`MENU_..xlsx`, sheet "MENU PENDIDIKAN"/"MENU 3B") bahwa Ahli Gizi memang isi master 1x per periode (5 komponen menu × 6 hari × jalur SISWA/TIGA_B), lalu detail harian (bahan+gizi+harga) di-generate per hari dengan menu ditarik dari master itu (dibuktikan cocok 1:1 antara sheet detail hari SENIN vs kolom SENIN master).
- **Rencana**: (1) Buka lagi endpoint POST/PUT/DELETE `/gizi/master-menu` (field sudah ada di schema: menuKarbohidrat/menuLaukHewani/menuLaukNabati/menuSayur/menuBuah per jalur+hari). (2) Tombol "Isi dari Master" di form Menu Harian — prefill 5 `MenuItem.namaMenu` sesuai hari+jalur blok aktif. (3) Tetap bebas diedit setelah prefill, TIDAK dikunci/divalidasi ke master (sesuai keputusan FINAL v5.3 — master bukan template wajib).
- **Status**: Belum dikerjakan.

### 2. [ ] Auto-Harga MenuItemBahan dari HargaBahanPeriode (Bukan Manual Lagi)
- **Deskripsi**: Dikonfirmasi via chat Akuntan-user: `MenuItemBahan.hargaSatuan` seharusnya TIDAK diinput manual oleh Ahli Gizi, melainkan otomatis mengambil dari `HargaBahanPeriode` (data Mitra) sesuai periode aktif. Ahli Gizi cukup pilih `bahanPokokId`, harga muncul read-only. Nilai gizi (energi/protein/lemak/karbo/serat) TETAP manual dari TKPI — tidak berubah, beda axis dari harga.
- **Rencana**: Ubah form input MenuItemBahan — field harga jadi read-only/auto-fill saat bahan dipilih. Perlu didiskusikan: kalau bahan belum ada harga di HargaBahanPeriode periode itu, gimana behavior-nya (block, atau submit dgn 0 + warning).
- **Status**: Belum dikerjakan, belum diaudit endpoint existing.

### 3. [ ] Audit Ahli Gizi: Granularitas Kendaraan/Mobil vs Realita Excel
- **Deskripsi**: Excel membagi kebutuhan per "Mobil 1/2/3" (grouping custom). Sistem saat ini hanya mendukung `PengirimanHarian` per `jenisPorsi` (Kecil/Besar, max 2 mobil).
- **Tugas Audit**: Tanyakan kepada user apakah butuh pengiriman per Mobil custom atau tetap per porsi sudah cukup.
- **Status**: Belum dikerjakan.

### 4. [ ] Code-splitting bundle size (Belum Urgent)
- **Deskripsi**: Peringatan build size di Vite (>500kB).
- **Langkah**: Optimalkan bundle size dengan `React.lazy` atau penataan `manualChunks`.
- **Status**: Belum dikerjakan.

### 5. [ ] Layout Cetak PO Gabungan Belum Sesuai Format Asli
- **Deskripsi**: Layout tabel cetak PO gabungan multi-tanggal saat ini belum 100% sesuai format Excel asli (referensi: sheet "12-13 SISWA B3"). Perlu audit ulang penyesuaian kop surat, urutan kolom, dan styling cetak.
- **Status**: Belum dikerjakan.

---

## C. Arsip Tugas Selesai (Completed)

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
