# Rencana Implementasi Layout & Perbaikan Data 4 Dokumen Resmi (LPA, SPTJ, BAPSD, BKU)

Dokumen ini menjelaskan rancangan layout visual, ketersediaan field data, gap yang ditemukan pada backend, serta langkah-langkah implementasi untuk merender format laporan resmi SPPG.

---

## 1. Ringkasan Kebutuhan 4 Dokumen Resmi

### A. Laporan Penggunaan Anggaran (LPA)
*   **Sumber Data**: `GET /api/laporan/lpa?periodeId=...&nomorDokumen=...`
*   **Field yang Dibutuhkan**:
    *   `namaLembaga` (string)
    *   `nomorDokumen` (string)
    *   `periodeLabel` (string)
    *   `namaPejabat` (string)
    *   `jabatan` (string)
    *   `nomorRekeningVA` (string)
    *   `tempatPelaporan` (string)
    *   `tanggalPelaporan` (string)
    *   `namaYayasan` (string)
    *   `ketuaYayasan` (string)
    *   `namaAkuntan` (string)
    *   `rincian` (array): `label` (kategori dana), `diajukan` (RAB), `terealisasi` (Aktual), `sisa`
    *   `total` (object): `diajukan`, `terealisasi`, `sisa`
*   **Section yang Dirender**:
    1.  **Kop Surat Resmi**: Logo lembaga (kiri) + Nama SPPG (besar, bold, center) + Alamat Lembaga (center) + Garis Horizontal pembatas kop.
    2.  **Judul Dokumen**: "LAPORAN PENGGUNAAN ANGGARAN" (center, bold) + Sub-judul "Nomor: [nomorDokumen]" (highlight kuning).
    3.  **Periode**: "Periode: [tanggalMulai] - [tanggalSelesai]" (di bawah judul).
    4.  **Blok Identitas Lembaga**: Rincian Nama/Jabatan/SPPG dengan label rata kiri dan titik dua sejajar.
    5.  **Kalimat Pembuka**: "Dengan ini menyatakan bahwa laporan penggunaan dana sebagai berikut:" (statis).
    6.  **I. RINCIAN KEGIATAN**: Tabel 4 kolom berisi Kategori Penggunaan (Bahan Baku, Operasional, Sewa), Anggaran Diajukan, Realisasi, dan Sisa Dana. Baris Total bercetak tebal (bold) dengan garis pembatas atas-bawah.
    7.  **II. KETERANGAN**: Deskripsi statis per kategori dana, nomor rekening VA, serta kalimat sisa dana.
    8.  **Footer Tanda Tangan**: 2 kolom tanda tangan (Pihak Pertama di kiri, Pihak Kedua di kanan). Di bagian bawah tengah ditambahkan "Mengetahui" Kepala SPPG.

### B. Surat Pernyataan Tanggung Jawab (SPTJ)
*   **Sumber Data**: `GET /api/laporan/sptj?periodeId=...`
*   **Field yang Dibutuhkan**:
    *   `namaPejabat` (string)
    *   `jabatan` (string)
    *   `jumlahPenerimaan` (number)
    *   `jumlahPengeluaran` (number)
    *   `sisaDana` (number)
    *   `tempatPelaporan` (string)
    *   `tanggalPelaporan` (string)
    *   `tahunAnggaran` (number) — **[GAP BACKEND]** saat ini belum dikembalikan oleh endpoint `/sptj`
*   **Section yang Dirender**:
    1.  **Kop Surat Resmi**: Identik dengan kop surat LPA.
    2.  **Judul Dokumen**: "SURAT PERNYATAAN TANGGUNG JAWAB" (center, bold).
    3.  **Identitas Pembuat**: "Saya yang bertanda tangan di bawah ini:" diikuti Nama dan Jabatan Kepala SPPG.
    4.  **Paragraf Baku**: Paragraf pertanggungjawaban formal dengan menyisipkan variabel `tahunAnggaran`.
    5.  **Tabel Angka Ringkasan**: Tabel 2 kolom berisi Jumlah Penerimaan, Jumlah Pengeluaran, dan Sisa Dana (bold + garis atas).
    6.  **Footer Tanda Tangan**: Hanya 1 tanda tangan Kepala SPPG di sebelah kanan (tempat + tanggal, "Mengetahui" + jabatan, space TTD, nama terang).

### C. Berita Acara Pengalihan Sisa Dana (BAPSD)
*   **Sumber Data**: `GET /api/laporan/bapsd?periodeId=...&nomorDokumen=...`
*   **Field yang Dibutuhkan**:
    *   `nomorDokumen` (string)
    *   `periodeLabel` (string)
    *   `sisaDana` (number)
    *   `tanggalMulaiBerikutnya` (string)
    *   `namaYayasan` (string)
    *   `ketuaYayasan` (string)
    *   `namaAkuntan` (string)
    *   `namaPejabat` (string)
    *   `tempatPelaporan` (string)
    *   `tanggalPelaporan` (string)
*   **Section yang Dirender**:
    1.  **Kop Surat Resmi**: Identik dengan kop surat LPA.
    2.  **Judul Dokumen**: "BERITA ACARA PENGALIHAN SISA DANA" (center, bold) + "Nomor: [nomorDokumen]" (highlight kuning).
    3.  **Paragraf Penjelasan**: Paragraf baku berisi informasi berakhirnya periode, nominal sisa dana yang dialihkan, serta tanggal awal penggunaan periode berikutnya.
    4.  **Footer Tanda Tangan**: 2 kolom tanda tangan (Akuntan SPPG di kiri, Kepala SPPG di kanan) + Tanda tangan Ketua Yayasan di tengah bawah sebagai pihak yang mengetahui.

### D. Catatan Pengeluaran Bulanan (Buku Kas Umum - BKU)
*   **Sumber Data**: `GET /api/laporan/bku?periodeId=...`
*   **Field yang Dibutuhkan**:
    *   `ringkasan` (object) — **[GAP BACKEND]**
        *   `namaLembaga`
        *   `alamat`
        *   `sisaDanaLalu` (saldo awal kas)
        *   `danaDiterimaSaatIni` (`Periode.totalDanaDiterima`)
        *   `danaTersedia` (`sisaDanaLalu` + `danaDiterimaSaatIni`)
        *   `biayaBahanBaku` (`getRealisasiPeriode` BAHAN_MAKANAN)
        *   `biayaOperasional` (`getRealisasiPeriode` OPERASIONAL)
        *   `biayaInsentifFasilitas` (`getRealisasiPeriode` INSENTIF_FASILITAS)
        *   `totalPengeluaran` (jumlah 3 biaya)
        *   `sisaDanaSaatIni` (`danaTersedia` - `totalPengeluaran`)
    *   `transaksi` (array): `bulan`, `tanggal`, `noBukti`, `uraian`, `nominal` / `kredit` (sebagai kolom Jumlah)
*   **Section yang Dirender**:
    1.  **Judul Laporan**: "CATATAN PENGELUARAN BULANAN" (center) + "Periode: [range tanggal]".
    2.  **Blok Info Lembaga**: Nama Lembaga & Alamat di sebelah kiri atas.
    3.  **Blok Ringkasan**: Tabel borderless horizontal yang merinci:
        *   Sisa dana yang lalu
        *   Dana yang diterima saat ini
        *   Jumlah dana tersedia (bold)
        *   Biaya bahan baku
        *   Biaya operasional
        *   Biaya insentif fasilitas
        *   Total pengeluaran (bold)
        *   Sisa dana saat ini (bold)
    4.  **Tabel Rincian Transaksi**: Tabel 5 kolom: Bulan | Tgl | No. Bukti | Uraian Transaksi | Jumlah. Hanya 1 kolom Jumlah (diambil dari nominal kredit untuk baris transaksi pengeluaran). Tanpa kolom saldo berjalan.

---

## 2. Analisis Gap Backend & Rencana Perubahan

### Gap 1: Variabel `tahunAnggaran` pada Laporan SPTJ
*   **Masalah**: Paragraf baku SPTJ memerlukan informasi `tahunAnggaran` (misalnya: TA 2026), namun endpoint `GET /api/laporan/sptj` saat ini belum mengembalikan variabel ini.
*   **Solusi**:
    Di `backend/src/routes/laporan.js` pada handler `/sptj`, kita akan membaca `tahunAnggaran` dari database (`SetupLembaga` sudah memiliki field `tahunAnggaran`) dan menyertakannya di dalam payload response JSON.
    ```javascript
    // Rencana modifikasi response /sptj
    res.json({
      success: true,
      data: {
        ...,
        tahunAnggaran: lembaga.tahunAnggaran
      }
    });
    ```

### Gap 2: Data Ringkasan Atas & Kategori Pengeluaran pada Laporan BKU
*   **Masalah**: Endpoint `GET /api/laporan/bku` saat ini hanya mengembalikan array transaksi jurnal kas mentah. Ia belum memuat data profil lembaga (`namaLembaga`, `alamat`), nominal `totalDanaDiterima` dari model `Periode`, dan breakdown realisasi untuk 3 kategori biaya (`BAHAN_MAKANAN`, `OPERASIONAL`, `INSENTIF_FASILITAS`).
*   **Solusi**:
    Di `backend/src/routes/laporan.js` pada handler `/bku`, kita akan:
    1.  Melakukan query ke `prisma.periode.findUnique` dengan `include: { setupLembaga: true }` untuk mendapatkan `totalDanaDiterima` serta informasi profil lembaga.
    2.  Melakukan 3 query agregasi paralel menggunakan `prisma.anggaranHarian.aggregate` (sebagai padanan `getRealisasiPeriode` di route file tersebut) untuk menghitung realisasi masing-masing kategori dana.
    3.  Memodifikasi struktur response JSON dari `/bku` agar memisahkan bagian `ringkasan` dan list `transaksi`.

---

## 3. Pertanyaan & Ambiguitas (Butuh Keputusan)

1.  **Gambar Logo Kop Surat**: Spec menyebutkan "logo lembaga (kiri)". Apakah kita perlu merender gambar logo dinamis/statis, atau cukup menyediakan placeholder gambar/icon logo yang seragam (misalnya lambang Garuda / logo SPPG generik)?
    *   *Rencana*: Kita gunakan placeholder ikon atau inisial logo yang rapi jika file gambar dinamis tidak disediakan di database.
2.  **Keterangan Deskripsi Statis di LPA Section II**: Spec menyebutkan: "II. KETERANGAN — teks deskripsi statis per kategori...".
    *   *Rencana [ASUMSI]*: Kami akan mem-hardcode kalimat deskripsi statis standar di tingkat komponen React. Contoh:
        *   Bahan Baku: "Penggunaan dana untuk penyediaan bahan makanan bergizi harian bagi sasaran penerima manfaat."
        *   Operasional: "Penggunaan dana untuk biaya persiapan, pengolahan, distribusi, dan administrasi pelayanan."
        *   Sewa (Insentif/Fasilitas): "Penggunaan dana untuk insentif tenaga masak, kader, dan biaya utilitas/fasilitas pelayanan."
3.  **Tampilan Tabel Transaksi BKU**: Spec menyebutkan "HANYA 1 kolom Jumlah (bukan Debet/Kredit terpisah), dan TANPA kolom saldoBerjalan per baris". Baris penerimaan dana (misal 500jt) tidak muncul di jurnal transaksi pembukuan kas bulanan jika ia tidak dicatat di ledger.
    *   *Rencana [ASUMSI]*: Transaksi di dalam tabel BKU hanya memuat baris-baris jurnal pengeluaran kas (`row.jenis === "KELUAR"` atau `row.kredit > 0`). Nilai penerimaan uang masuk hanya ditampilkan di bagian ringkasan atas sebagai `Dana yang diterima saat ini` (diambil dari `Periode.totalDanaDiterima`).
4.  **Tahun Anggaran di SPTJ**: Pada kalimat "...APBN TA [tahun] melalui DIPA Badan Gizi Nasional TA [tahun]", apakah keduanya memakai variabel `tahunAnggaran` yang sama?
    *   *Rencana*: Ya, keduanya akan diisi dengan `tahunAnggaran` yang diperoleh dari `SetupLembaga`.

---

## 4. Urutan Langkah Pengerjaan

1.  **Langkah 1 (Backend)**: Perbaiki endpoint `GET /api/laporan/sptj` untuk mengembalikan `tahunAnggaran`.
2.  **Langkah 2 (Backend)**: Perbaiki endpoint `GET /api/laporan/bku` agar mengembalikan objek `ringkasan` (yang berisi breakdown realisasi 3 kategori biaya, profil lembaga, dan info dana periode) di samping list `transaksi`.
3.  **Langkah 3 (Frontend - LaporanPage)**: Implementasikan layout visual resmi untuk keempat jenis laporan (LPA, SPTJ, BAPSD, dan BKU/Catatan Pengeluaran Bulanan) ketika diakses di menu "Laporan Keuangan SPPG" oleh Akuntan.
4.  **Langkah 4 (Frontend - DokumenResmiPage)**: Implementasikan layout visual yang sama untuk LPA, SPTJ, dan BAPSD di area preview generator dokumen resmi sebelum diterbitkan.
