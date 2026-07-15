Yang belum dikerjakan dan harus diperbaiki:
1. [x] card Rincian "Detail Penerima Manfaat" aslap, "Tambah Kendaraan Baru", "Tambah Master Menu" ahli gizi  ubah warna backgrond menjadi putih
2. [x] implementasikan migrasi component tabel ke tabel kendaraan "Menu Harian" ahli gizi, 

BUG:
- [x]perhatikan component calender pada datepicker pelajari dan pahami
    terjadi bug jika open dilayar dekat bawah atau header dia terbuka dan memotong sebagian. solusi buat jika layar terasa kurang otomatis calender diatas datepicker

- [x] bagian side nav ada scrolling kesamping. analisis itu bisa kenapa. kemungkinan itu terjadi karena ruang size button melewati batas content dan scrolling. solusi mungkin bisa tambahkan ruang content sehingga scrolling kiri kanan tidak muncul

Redesign layout laporan dokumen
[x] Redesign Component V1:
- scope = dropdown component (only)
    Cara:
    1. pahami dan pelajari components\FieldButton.jsx karena itu kumpulan component
    2. pahami dan peljri  cara kerja component dropdown yang ada di Sistem_SPPG\Testing, pahami cara kerja hanya saat onklik atau diklik.
    3. Terapkan pada dropdown di halaman JurnalTransaksiPage.jsx bagian "Jenis Transaksi"
    4. jika user aproved, migrasi ke semua component yang gunakan dropdown
    5. jika user aproved lagi, migrasi teknik onklik atau jika di klik pada component date picker
    6. jika user aproved lagi, migrasi teknik onklik atau jika di klik pada component input

[x]Redesign notif messages: 
   cara :
   1. pahami cara kerja notif nya kondisi sekarang jika salah input atau input berhasil ada diatas halaman.
   2. redesign menjadi pop-up di atas kanan dengan durasi 3 detik (buat card rounded)
   3. implementasikan ke laporan/periode-setup
   4. jika user aproved, migrasi ke seluruh halaman

[x]Redesign card pada halaman dashboard
    Cara :
    1. pahami dan pelajari cara kerja card pada Sistem_SPPG\Testing\components\Card.jsx
    2. terapkan di halaman Sistem_SPPG\frontend\src\components\DashboardSummaryCards.jsx
    3. jika aproved migrasi ke seluruh card yang ada di halaman dasboard semua role kecuali card "Pintasan Aksi Cepat"
    

New Task:
- [x] tambahkan fitur nama halaman yang sedang dibuka singkronkan ke tab web
- [x] Tambahkan FItur Notifikasi plan:
    1. tambahkan icon di header untuk notifikasi di sebelah kiri logout header
    2. buat layour notifikasi dan icon
    3. Kerjakan 1 dulu dihalaman akuntan
    4. jika aproved migrasi ke seluruh role
- [x] Tambahkan role admin yang memiliki halaman
    1. Setting user (nambah user, hapus yang terdaftar atau edit)
    2. halaman input kendaraan (migrasi di role ahli gizi ke role admin)
    3. halaman tempat nampung tiket / permintaan perbaikan
- [x] Tambahkan fitur lapor untuk ada kesalahan atau bug ke admin semua role
- [x] tambahkan fitur dashboard grafik
- [x] bisa klik notif langsung menuju ke halaman 
- [x] component login field masih lama buat yang terbaru
= [] redesign pada component yaitu calender. pada bagian "hari minggu" design menjadi wrna merah

Laporan
## TODO — Layout Laporan Sesuai Format BGN

**Status:** Perencanaan layout LPA dan SPTJ telah disetujui (ACC) & diimplementasikan. Menunggu layout BAPSD dan BKU. — Lihat `.ai-context/08-PLAN-LAYOUT-DOKUMEN.md`.

### Blocking questions (jawab dulu sebelum eksekusi):
- [x] Ada file/template resmi BGN (PDF/Word contoh LPA, SPTJ, BAPSD asli)
      buat dijadiin acuan layout? Kalau ada → upload, jangan biarin agent
      nebak format dari nama field doang.
- [x] Kalau gak ada file resmi → deskripsikan manual per dokumen (LPA,
      SPTJ, BAPSD): urutan section, posisi header/kop surat, urutan tabel
      rincian, posisi & jumlah kolom tanda tangan, placement nomor
      dokumen/tanggal.

### Kenapa gak boleh asal jalan:
Dokumen ini dipakai buat pelaporan resmi ke BGN (uang negara/audit). Kalau
agent ngarang layout dari asumsi, resiko dokumen ditolak pas dipakai
beneran. Wajib ada acuan konkret dulu.

### Setelah acuan didapat, baru scope teknis:
- Cocokkan tiap section template ke field yang sudah di-generate fungsi
  `generateLPA` / `generateSPTJ` / `generateBAPSD` (lihat
  06-QUERY-REFERENCE.md) — pastikan semua field yang dibutuhkan template
  sudah tersedia dari fungsi itu, sebelum nulis komponen render.
- Kalau ada field template yang BELUM ada di fungsi generate → itu gap
  baru, laporkan dulu sebelum nambah field ke query.

---

## TODO — Preview Dokumen Resmi Masih JSON (bukan visual)

**Status:** Perencanaan layout diajukan (menunggu ACC) — Lihat `.ai-context/08-PLAN-LAYOUT-DOKUMEN.md`.

### Blocking question (jawab dulu, ini punya gua bukan agent):
- [x] Dokumen resmi (LPA/SPTJ/BAPSD) akhirnya mau:
  - (A) Cukup di-preview di browser doang (HTML, print-friendly via
        `window.print()`), ATAU
  - (B) Harus bisa di-generate jadi file PDF beneran (buat
        ditandatangan fisik / upload ke sistem BGN)?
  → Ini nentuin pendekatan teknis beda jauh (HTML+print vs library PDF
    kayak pdfkit/puppeteer di backend atau react-pdf/jsPDF di frontend).
    Keputusan ini gantung sama keputusan layout BGN di atas — sebaiknya
    diputusin bareng.

### Sebelum agent eksekusi, wajib minta verbatim dulu:
- [x] Kutip komponen preview yang sekarang (kemungkinan
      DokumenResmiPage.jsx) — bagian yang render preview, cek apa emang
      cuma `<pre>{JSON.stringify(...)}</pre>` atau sejenis.
- [x] Konfirmasi apa fungsi `generateLPA`/`generateSPTJ`/`generateBAPSD`
      sudah dipanggil dari endpoint API dan di-fetch frontend, atau
      frontend masih fetch raw data lain manual.

### Urutan pengerjaan disaranin:
1. Selesaikan keputusan layout BGN dulu (task di atas).
2. Baru bangun preview visual dokumen resmi mengikuti layout yang sudah
   disepakati — jangan bangun 2x (preview asal dulu, ganti lagi pas
   layout BGN selesai).