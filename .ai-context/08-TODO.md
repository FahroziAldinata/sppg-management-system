## Code-splitting bundle size (belum urgent)

- Vite build warning: ada chunk >500kB minified (pre-existing sejak awal,
  bukan dari cleanup unused-files 2026-07-15).
- Fix: `React.lazy` per halaman role (Aslap/Mitra/Gizi/Akuntan/Kepala) atau
  `manualChunks` di `vite.config.js`.
- Prioritas: rendah. Kerjakan kalau ada bukti nyata loading lambat di
  lapangan (terutama Aslap pakai koneksi HP), bukan preventif.
- Scope: refactor import/routing, BUKAN bagian audit file gak kepake.

## Daftar Nominatif Upah — redesign jadi grid excel-like (belum diaudit)

Masalah (keluhan user): input sekarang per-relawan per-hari (buka satu-satu),
harusnya tabel grid kayak Excel asli — baris relawan (dikelompokkan per jenis
pekerjaan), kolom tanggal aktif periode, isi cell cukup checklist hadir/tidak.
Nominal harian TIDAK diinput manual tiap hari — nilainya tetap/sama per jenis
pekerjaan, jadi cukup dicentang hadir → nominal otomatis muncul.

Referensi asli: screenshot Excel "DAFTAR NOMINATIF PEMBAYARAN UPAH SUKARELAWAN"
- kolom tanggal dinamis (1 s.d 17, minggu/libur di-highlight merah = default
  tidak dibayar/disabled)
- kolom kanan tetap per relawan: Honorarium Sukarelawan, Dana Kesehatan, TK,
  PJ, Total Upah
- baris TOTAL di bawah, sum per kolom tanggal + total keseluruhan

WAJIB AUDIT SEBELUM BUILD (jangan asumsi field):
1. Schema `DaftarNominatifUpahHarian` sekarang: field nominal per hari itu
   disimpan manual per row, atau ada field tarif tetap per jenis pekerjaan/
   relawan? Kalau nominal manual per hari (kemungkinan besar, based on
   progress log "detail harian"), redesign ini butuh field BARU semacam
   tarifHarian per jenis pekerjaan/relawan — ini schema change, bukan cuma UI.
2. Cek field "hadir" ada gak sekarang (boolean), atau nominal>0 dianggap hadir?
3. Cek gimana libur/minggu ditandai sekarang (field terpisah atau dari
   kalkulasi tanggal client-side, ada catatan soal "6 titik DatePicker
   generic ... Tanggal Libur" di progress log — kemungkinan ada tabel Libur).
4. HONORARIUM SUKARELAWAN & TOTAL UPAH itu derived (SUM), danaKesehatan/tk/pj
   manual per relawan per periode — ini sudah dikonfirmasi di
   01-ARCHITECTURE.md, JANGAN diubah jadi kolom baru, cukup tampil di grid.

Prioritas: sedang. Jangan mulai coding sebelum poin 1-3 di atas dijawab
verbatim dari schema/handler asli.