# Handover Prompt — Implementasi Render Layout 4 Dokumen Resmi & Tambal Backend

Hai! Anda adalah AI agent pengganti saya. Tugas Anda berikutnya adalah mengimplementasikan **layout visual resmi untuk 4 dokumen (LPA, SPTJ, BAPSD, BKU)** serta melakukan penambalan data (patch) pada backend.

Rencana rinci telah didokumentasikan di berkas:
👉 `d:\Project\Sistem\Sistem_SPPG\.ai-context\08-PLAN-LAYOUT-DOKUMEN.md`

Sebelum mulai coding, bacalah file rencana di atas agar Anda paham struktur layout dan gap backend yang didesain. Berikut adalah rangkuman langkah instruksi yang wajib Anda ikuti secara berurutan:

---

## LANGKAH 1: Tambal Gap Backend (Backend Patch)
Buka berkas backend `backend/src/routes/laporan.js` dan lakukan perubahan berikut:

1.  **Untuk endpoint `/sptj` (GET /api/laporan/sptj)**:
    *   Ambil field `tahunAnggaran` dari database `SetupLembaga` (model `SetupLembaga` sudah terasosiasi dengan periode).
    *   Expose `tahunAnggaran` ke dalam objek data JSON response agar bisa dibaca di frontend.
2.  **Untuk endpoint `/bku` (GET /api/laporan/bku)**:
    *   Query data `Periode` berdasarkan `periodeId` dengan meng-`include` model `setupLembaga` untuk mendapatkan `totalDanaDiterima`, `namaLembaga`, dan `alamat`.
    *   Lakukan query agregasi sum secara paralel menggunakan `Promise.all` dan `prisma.anggaranHarian.aggregate` untuk menghitung realisasi pengeluaran (`aktual`) pada 3 kategori dana: `BAHAN_MAKANAN`, `OPERASIONAL`, dan `INSENTIF_FASILITAS`.
    *   Modifikasi response JSON agar mengembalikan:
        ```json
        {
          "success": true,
          "data": {
            "ringkasan": {
              "namaLembaga": "...",
              "alamat": "...",
              "sisaDanaLalu": 1000000,
              "danaDiterimaSaatIni": 500000000,
              "danaTersedia": 501000000,
              "biayaBahanBaku": 150000000,
              "biayaOperasional": 30000000,
              "biayaInsentifFasilitas": 20000000,
              "totalPengeluaran": 200000000,
              "sisaDanaSaatIni": 301000000
            },
            "transaksi": [ ...list jurnal transaksi... ]
          }
        }
        ```
3.  **Restart Backend**:
    *   Setelah mengedit file route di backend, matikan proses backend yang berjalan lama (Port 3000) lalu jalankan kembali menggunakan `node index.js`. (Gunakan `Get-NetTCPConnection -LocalPort 3000` -> `Stop-Process -Id <PID> -Force` di PowerShell).

---

## LANGKAH 2: Render Layout Laporan Keuangan di Frontend (`LaporanPage.jsx`)
Buka berkas `frontend/src/pages/akuntan/laporan/LaporanPage.jsx`. Ganti preview laporan sederhana/tabel mentah dengan render layout yang sangat premium, rapi, dan formal:

1.  **LPA**:
    *   Buat layout ber-Kop Surat formal (dengan logo placeholder di sebelah kiri, nama SPPG besar bold di tengah, alamat, dan garis horizontal tebal di bawah kop).
    *   Tampilkan Judul "LAPORAN PENGGUNAAN ANGGARAN" (center) dengan Nomor Dokumen dihighlight warna kuning.
    *   Render tabel rincian kegiatan (4 kolom: Kategori Penggunaan, Anggaran Diajukan, Realisasi, Sisa Dana) dengan baris Total tebal (bold) bergaris atas-bawah.
    *   Tampilkan bagian Keterangan Statis dan nomor rekening VA.
    *   Render Footer tanda tangan 2 kolom (Pihak Pertama kiri, Pihak Kedua kanan) + "Mengetahui" Kepala SPPG di tengah bawah.
2.  **SPTJ**:
    *   Gunakan Kop Surat yang sama.
    *   Tampilkan judul "SURAT PERNYATAAN TANGGUNG JAWAB".
    *   Gunakan paragraf pertanggungjawaban formal dengan variabel `tahunAnggaran` (yang di-expose dari backend).
    *   Tampilkan tabel ringkasan 3 baris angka (Penerimaan, Pengeluaran, Sisa) ber-border rapi.
    *   Render Footer tanda tangan 1 kolom (Kepala SPPG) di sebelah kanan bawah.
3.  **BAPSD**:
    *   Gunakan Kop Surat yang sama.
    *   Tampilkan judul "BERITA ACARA PENGALIHAN SISA DANA" beserta nomor dokumen dihighlight kuning.
    *   Tampilkan paragraf pengalihan sisa dana, tanggal periode berikutnya, dan Footer TTD 2 pihak (Akuntan & Kepala) + Ketua Yayasan di tengah bawah.
4.  **BKU (Catatan Pengeluaran Bulanan)**:
    *   Tampilkan judul "CATATAN PENGELUARAN BULANAN" dan periode rentang tanggal.
    *   Tampilkan Nama Lembaga & Alamat di sebelah kiri atas.
    *   Tampilkan tabel Ringkasan Atas tanpa border kolom yang merinci kalkulasi saldo berjalan (Sisa dana lalu, Dana diterima saat ini, Dana tersedia, Biaya bahan baku, Biaya operasional, Biaya insentif fasilitas, Total pengeluaran, Sisa dana saat ini).
    *   Tabel rincian hanya menampilkan 5 kolom: Bulan | Tgl | No. Bukti | Uraian Transaksi | Jumlah.
    *   Kolom Jumlah diisi dari nominal kredit transaksi (`row.jenis === "KELUAR"` atau `row.kredit > 0`). Jangan tampilkan kolom debet/kredit terpisah dan kolom saldo berjalan per baris.

---

## LANGKAH 3: Render Layout Preview di Frontend (`DokumenResmiPage.jsx`)
Buka berkas `frontend/src/pages/akuntan/DokumenResmiPage.jsx`.
*   Ganti visualisasi data JSON mentah pada bagian `<pre>{JSON.stringify(previewData, null, 2)}</pre>` dengan meng-import/membuat komponen visual layout yang sama (LPA, SPTJ, BAPSD) seperti yang telah diimplementasikan di `LaporanPage.jsx`.
*   Hal ini agar Akuntan bisa melihat secara langsung *print preview* layout formal dokumen tersebut sebelum menekan tombol "Terbitkan Dokumen Resmi".

---

## Ketentuan Tambahan
*   Pastikan styling konsisten dengan CSS token system (menggunakan variabel CSS seperti `--border`, `--bg-elevated`, `--text`, dll) agar dark/light mode bekerja sempurna.
*   Seluruh format rupiah wajib menggunakan formatting lokal Indonesia (`Rp{Number(val).toLocaleString('id-ID')}`).
*   Jangan melakukan modifikasi skema database karena skema database saat ini sudah final dan mencukupi.

Silakan mulai pengerjaan dari Langkah 1 (Backend Patch) terlebih dahulu. Selamat bekerja!
