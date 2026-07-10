Yang belum dikerjakan dan harus diperbaiki:
1. card Rincian "Detail Penerima Manfaat" aslap, "Tambah Kendaraan Baru", "Tambah Master Menu" ahli gizi  ubah warna backgrond menjadi putih
2. implementasikan migrasi component tabel ke tabel kendaraan "Menu Harian" ahli gizi, 
3. Redesign Tabel :
    Scope/case: header tabel tidak sejajar dan keluar content
    cara:
    1. pahami header dar database asli (prisma) kumpulkan 
    2. pahami layout component table.
    3. crosscheck kenapa bisa keluar dari tabel
    4. implementsi dulu pertama di halaman akuntan\JurnalTransaksiPage.jsx bagian "Daftar Jurnal Transaksi"
    4. jika user aproved, migrasi ke halaman gunakan tabel all role
BUG:

- bagian side nav ada scrolling kesamping. analisis itu bisa kenapa. kemungkinan itu terjadi karena ruang size button melewati batas content dan scrolling. solusi mungkin bisa tambahkan ruang content sehingga scrolling kiri kanan tidak muncul

Redesign layout laporan dokumen
Redesign Component V1:

- scope = dropdown component (only)
    Cara:
    1. pahami dan pelajari components\FieldButton.jsx karena itu kumpulan component
    2. pahami dan pelajri  cara kerja component dropdown yang ada di Sistem_SPPG\Testing, pahami cara kerja hanya saat onklik atau diklik.
    3. Terapkan pada dropdown di halaman JurnalTransaksiPage.jsx bagian "Jenis Transaksi"
    4. jika user aproved, migrasi ke semua component yang gunakan dropdown
    5. jika user aproved lagi, migrasi teknik onklik atau jika di klik pada component date picker
    6. jika user aproved lagi, migrasi teknik onklik atau jika di klik pada component input

Redesign warning messages: 
   cara :
   1. pahami cara kerja notif nya kondisi sekarang jika salah input ada diatas halaman.
   2. redesign menjadi pop-up di atas kanan dengan durasi 3 detik (buat card rounded)
   3. implementasikan ke laporan/periode-setup
   4. jika user aproved, migrasi ke seluruh halaman

Redesign card pada halaman dashboard
    Cara :
    1. pahami dan pelajari cara kerja card pada Sistem_SPPG\Testing\components\Card.jsx
    2. terapkan di halaman Sistem_SPPG\frontend\src\components\DashboardSummaryCards.jsx
    3. jika aproved migrasi ke seluruh card yang ada di halaman dasboard semua role kecuali card "Pintasan Aksi Cepat"
    

New Task:
- tambahkan fitur nama halaman yang sedang dibuka singkronkan ke tab web
- Tambahkan FItur Notifikasi plan:
    1. tambahkan icon di header untuk notifikasi di sebelah kiri logout
    2. buat layour notifikasi dan icon
    3. Kerjakan 1 dulu dihalaman akuntan
    4. jika aproved migrasi ke seluruh role
- Tambahkan role admin yang memiliki halaman
    1. Setting user (nambah user, hapus yang terdaftar atau edit)
    2. halaman input kendaraan (migrasi di role ahli gizi ke role admin)
    3. halaman tempat nampung tiket / permintaan perbaikan
- Tambahkan fitur lapor untuk ada kesalahan atau bug ke admin semua role


