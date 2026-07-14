# Handover Prompt — Redesign Layout & PDF Preview (LPA, SPTJ, BAPSD, BKU)

Sesi sebelumnya telah menyelesaikan seluruh migrasi dasar preview dari JSON ke PDF untuk LPA, SPTJ, dan BAPSD, serta pemolesan visual terperinci agar LPA fit dalam 1 lembar halaman dan persis screenshot.

## 1. Progress yang Sudah Selesai (Sesi Ini)
- [x] **Kop Surat & Logo BGN**: Logo resmi BGN disalin ke `backend/assets/dokumen-resmi/logo-bgn.png` dan di-encode ke Base64 secara dinamis di [shared.js](file:///e:/Project/Sistem_SPPG/backend/src/templates/dokumen/shared.js). Header Kop Surat di-hardcode ke nama resmi panjang `"SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) SUMEDANG UJUNGJAYA PALABUAN"` jika memuat kata "PALABUAN", dan format alamat diawali `"Alamat : "` agar 100% identik dengan screenshot.
- [x] **Optimasi Layout 1 Halaman**:
  - Margin halaman A4 diubah menjadi `15mm 15mm 15mm 20mm` di [shared.js](file:///e:/Project/Sistem_SPPG/backend/src/templates/dokumen/shared.js).
  - Padding baris tabel rincian diatur sangat ketat (`padding: 3px 6px`, `line-height: 1`) dan margin bawah tabel dihapus agar muat dalam satu halaman.
  - Tinggi area tanda tangan (`ttd-ruang`) dikurangi menjadi `48px`.
  - Tanggal pelaporan di kolom tanda tangan Pihak Kedua ditambahkan jarak spasi non-breaking `&nbsp;` agar terpisah rapi (`Sumedang,      17 Januari 2026`).
- [x] **Revisi Susunan Periode & Deskripsi**:
  - Label periode diatur rata kiri, tebal/bold (`Periode: 8-17 Januari 2026`).
  - Menambahkan kalimat deskriptif `"Yang bertanda tangan di bawah ini:"` tepat di bawah baris periode sebelum tabel identitas.
- [x] **Revisi Rotasi Identitas Lembaga**:
  - Susunan diubah menjadi: (1) Nama Pejabat (label: `Nama`), (2) Jabatan (label: `Jabatan`), (3) Nama Lembaga (label: `SPPG`).
  - Nomor Rekening VA dihapus dari tabel identitas di atas.
- [x] **Revisi Header & Isi Tabel Rincian**:
  - Header kolom pertama diubah langsung menjadi `I. RINCIAN KEGIATAN` (rata kiri).
  - Header kolom angka diubah menjadi: `Dana Diajukan (Rp)`, `Dana Terealisasi`, dan `Sisa Dana (Rp)`.
  - Nilai nominal angka pada tabel diubah menjadi formatted number murni tanpa awalan "Rp" (menggunakan fungsi helper baru `formatNumberTabel` di `shared.js`), dan mencetak `"-"` jika nominal bernilai 0.
  - Baris TOTAL diatur tebal dan garis double horizontal tebal hanya diterapkan pada kolom nominal angka, sedangkan kolom label "Total" tidak ikut.
- [x] **Revisi Bagian Keterangan**:
  - Sub-judul II. KETERANGAN menggunakan margin atas 10px dan bawah 4px.
  - Penomoran list rincian kategori dihilangkan. Item keterangan disejajarkan menggunakan tabel tak ber-border dengan lebar kolom label `210px` agar titik dua (`:`) sejajar rapi.
  - Baris Nomor Rekening VA (`Nomor rekening/Virtual Account : [Nomor]`) dipindahkan dan ditampilkan di dalam tabel keterangan di bawah kategori ketiga (Insentif Fasilitas).
  - Kalimat narasi sisa dana disesuaikan: `"Sisa dana sebesar Rp[angka],- akan dialihkan ke periode selanjutnya. Pengalihan sisa dana ini bertujuan untuk mendukung kegiatan yang telah direncanakan."` (nominal tanpa pemisah ribuan murni string angka sesuai screenshot: `Rp202514668,-`).
- [x] **Revisi Susunan Footer TTD**:
  - Kolom kiri (Pihak Pertama): Nama Yayasan di atas, nama penandatangan di tengah, Jabatan (`Ketua/Mewakili`) di bawah nama. Tanpa cetakan tanggal.
  - Kolom kanan (Pihak Kedua): Tanggal pelaporan di paling atas, disusul jabatan `Akuntan SPPG ...`, nama penandatangan di bawah.
  - Mengetahui (Kepala SPPG) dicetak di tengah bawah secara terpisah dengan perataan kiri di dalam kolomnya.

## 2. Tugas Sesi Berikutnya (Next Steps)
1. **Verifikasi LPA**:
   * Jalankan server frontend (`npm run dev`) dan backend (`node index.js`).
   * Test tombol **Preview** untuk LPA di halaman Laporan/Dokumen Resmi.
   * Verifikasi tampilan visual PDF LPA (Kop Surat, tabel tanpa border vertikal, logo BGN, susunan tanda tangan).
2. **Migrasi Desain Visual**:
   * Salin pola ralat border tabel, logo BGN, dan alamat ini ke dokumen **SPTJ** dan **BAPSD**.
3. **Poles Visual Dokumen BBK/BKU**:
   * Rancang visualisasi BKU sebagai PDF dan hubungkan ke UI frontend.
