# Daftar Tugas SPPG — Implementasi Laporan (Juli 2026)

## A. Sedang Dikerjakan (In Progress)

_Tidak ada tugas aktif saat ini._

---

## B. Tugas Terbuka (Todo)

### B.1 — Sheet "Saldo Buku" (Neraca Saldo)

Excel layout:
```
SALDO AWAL BUKU
Nama Lembaga / Alamat
KODE | NAMA AKUN | SALDO AWAL | SALDO AKHIR | CEK SALDO
1000  BUKU KAS UMUM            202514668    BKU=PC+Bank
1100  BUKU PEMBANTU KAS                     BP Kas
1101  Petty Cash/Cash in Hand  1931000
1102  Kas di Bank              200583668    Oke, Cocok
2000  BUKU PEMBANTU JENIS DANA              Oke, Cocok
2110  Dana Bahan Baku          15099600
2120  Dana Operasional         187415068
2130  Dana Insentif Fasilitas  0
2140  Pungutan/Setoran PPN     0
...
2190  Biaya Bahan Baku         0
...
```

- [ ] **Task 1a: Backend endpoint `GET /api/laporan/neraca-saldo`**
  - Query semua akun (KAS + DANA + BIAYA) + saldoAwal dari SaldoAwalPeriode
  - Hitung totalDebet/Kredit per akun dari JurnalTransaksi (via akunKasId atau akunDanaBiayaId)
  - Hitung saldoAkhir = saldoAwal + totalDebet - totalKredit
  - Sertakan verifikasi: BKU = PettyCash + Bank, TotalDana - TotalBiaya = BKU
  - Response: `{ akun[], verifikasi: { bkuCocok: bool, danaBiayaCocok: bool, pesan: string } }`

- [ ] **Task 1b: Frontend — tambah opsi "Neraca Saldo" di dropdown LaporanPage**
  - Value: `'NERACA_SALDO'`
  - Navigasi ke `/akuntan/laporan/neraca-saldo` (tambah route baru di App.jsx)
  - Render tabel: KODE | NAMA AKUN | SALDO AWAL | TOTAL DEBET | TOTAL KREDIT | SALDO AKHIR
  - Render badge verifikasi ✅/❌ di atas tabel

### B.2 — Sheet "Anggaran" (Ringkasan + Auto-fill Aktual + UX Gaps)

**Audit (Excel vs Sistem):** Kolom data fully covered via `AnggaranHarian` + `AnggaranBahanMakananDetail`. Gap di UX dan aggregasi.

Excel actual layout (3 side-by-side tables):
```
1. ANGGARAN BAHAN MAKANAN (col 3-18)
Hari/Tgl | Jml Paket MBG | KB&TK | SD1-3 | SD4-6 | SMP | SMK&PIC | Balita | Bumil | Busui&PIC | Hrg Sat MBG | Hrg Sat MBG2 | RAB | Aktual | Selisih | Keterangan
Sen,5   | 1680          | 23    | 308   | 338   | 0   | 246     | 552    | 42    | 171       | 8000        | 10000        | 15M |        |         |
         Total: 15120   | 207   | 2772  | 3042  | 0   | 2214    | 4968   | 378   | 1539      |             | -            | 135M|        |         |

2. ANGGARAN OPERASIONAL (col 20-26)
Hari/Tgl | Jml Paket MBG | Hrg Sat MBG | RAB | Aktual | Selisih | Keterangan
         |               |             | 0   |        |         |

3. ANGGARAN INSENTIF FASILITAS (col 28-34)
Hari/Tgl | Jml Paket MBG | Hrg Sat MBG | RAB       | Aktual | Selisih | Keterangan
Sen,5   | 3000          | 2000        | 6,000,000 |         |         |
Total:  | 36000         |             | 72,000,000|         |         |
```

Footer per tabel: Surplus/Utang + Total row (Jml Paket, RAB)

Sistem sudah punya:
- ✅ `AnggaranHarian` (tanggal, kategoriDana, jumlahPaket, rab, aktual, selisih, keterangan)
- ✅ `AnggaranBahanMakananDetail` (per kategori penerima: kategoriId, jumlahPaket, hargaSatuan, subtotal)
- ✅ CRUD backend (POST/GET/PUT/DELETE) — frontend cuma CREATE + LIST, **tidak ada edit/delete**

- [ ] **Task 2a: Auto-fill aktual AnggaranHarian** dari SUM JurnalTransaksi per kategori (akunDanaBiaya.tipe BIAYA → kategoriDana), dikelompokkan per tanggal
  - BAHAN_MAKANAN → SUM nominal jurnal WHERE akunDanaBiaya.tipe = BIAYA AND kategoriDana = BAHAN_MAKANAN
  - Operasional → WHERE tipe BIAYA AND kategoriDana = OPERASIONAL
  - Fasilitas → WHERE tipe BIAYA AND kategoriDana = INSENTIF_FASILITAS

- [ ] **Task 2b: Backend endpoint `GET /api/laporan/ringkasan-anggaran`**
  - Return total RAB, total Aktual, total Selisih, Surplus/Utang per kategori
  - Response mirip per-periode tapi dengan data akurat dari AnggaranHarian

- [ ] **Task 2c: Frontend — tampilkan total & surplus/utang di tab Anggaran**
  - Tambah ringkasan kartu di atas tabel harian: Total RAB, Total Aktual, Total Selisih, Surplus/Utang per kategori
  - 3 kartu side-by-side (BAHAN_MAKANAN, OPERASIONAL, INSENTIF_FASILITAS)

- [ ] **Task 2d: Frontend — tambah kolom Keterangan + Harga Satuan di tabel**
  - Kolom `Keterangan` (dari field `keterangan`) — ada di DB, tidak tampil di tabel
  - Kolom `Harga Satuan` (dari field `hargaSatuan`) — hanya untuk non-BAHAN_MAKANAN

- [ ] **Task 2e: Frontend — tombol edit/hapus per baris Anggaran**
  - PUT/DELETE endpoint sudah ada di backend, frontend tidak punya aksinya
  - Edit: klik → form terisi → PUT
  - Hapus: konfirmasi → DELETE

### B.3 — Sheet "BKU" (Perbaikan PDF BKU — jadi format Debet/Kredit/Saldo)

Excel layout:
```
BUKU KAS UMUM
Periode : 8-17 Januari
Nama Lembaga / Alamat                           Saldo Awal: 0
                                                 Saldo Akhir: 202514668
Bulan | Tgl | No. Bukti | Uraian Transaksi | Debet | Kredit | Saldo
1     | 2   | 3         | 4                 | 5     | 6      | 7
x     |     |           | SALDO AWAL        | 0     | 0      | 0
Jan   | 7   | 001      | Dana BanPer Bahan  | 135M  | 0      | 135M
Jan   | 7   | 002      | Dana BanPer Ops    | 274M  | 0      | 410M
Jan   | 8   | 004      | Insentif Fas 1-7   | 0     | 36M    | 464M
...   (ALL transaksi, MASUK + KELUAR)
```

- [ ] **Task 3a: Backend — ubah response BKU JSON** → tambah field `akunKas.nama` (sumber kas) di setiap transaksi (sudah ada di `getBkuData` via include, tapi belum dipakai di response PDF)

- [ ] **Task 3b: Template BKU PDF (`bku.js`)** — ubah tabel:
  - Tampilkan SEMUA transaksi (hapus filter `kredit > 0` di baris 65)
  - Tambah kolom Debet + Kredit (ganti kolom "Jumlah")
  - Tambah kolom Saldo (berjalan per baris)
  - Tambah kolom Keterangan (sumber kas dari `akunKas.nama`)
  - Header tabel: Bulan | Tgl | No. Bukti | Uraian Transaksi | Debet | Kredit | Saldo | Keterangan
  - Baris "SALDO AWAL BULAN BERJALAN" di atas data (seperti Excel)

- [ ] **Task 3c: PDF juga tampilkan ringkasan (seperti Excel)**
  - Saldo Awal (sisa dana lalu) di header area
  - Saldo Akhir di header area (sisa dana saat ini)

### B.4 — Sheet "BP Kas", "BP Bahan Baku", "BP Operasional", "BP Fasilitas"

Excel layouts:
```
**BP Kas**: BUKU PEMBANTU KAS
  Buku Pembantu: Petty Cash/Cash in Hand     Saldo Awal: 0 | Saldo Akhir: 1931000
  Bulan | Tgl | No. Bukti | Uraian | Debet | Kredit | Saldo   ← TANPA Keterangan

**BP Bahan Baku**: BUKU PEMBANTU DANA BAHAN BAKU
  Jenis Buku Pembantu: Bahan Baku (Dana Bahan Baku / Biaya Bahan Baku)
  Saldo Awal: 0 | Saldo Akhir: 15099600
  Bulan | Tgl | No. Bukti | Uraian | Debet | Kredit | Saldo | Keterangan   ← PAKAI Keterangan

**BP Operasional**: BUKU PEMBANTU DANA OPERASIONAL (sama)
**BP Fasilitas**: BUKU PEMBANTU DANA INSENTIF FASILITAS (sama)
```

- [ ] **Task 4a: Backend — buat 4 endpoint spesifik**
  - `GET /api/laporan/bp/kas?periodeId=X` — transaksi dengan akunKas tipe KAS (Petty Cash + Bank)
  - `GET /api/laporan/bp/bahan-baku?periodeId=X` — transaksi dengan kategori Dana/Biaya Bahan Baku
  - `GET /api/laporan/bp/operasional?periodeId=X` — transaksi dengan kategori Operasional
  - `GET /api/laporan/bp/fasilitas?periodeId=X` — transaksi dengan kategori Insentif Fasilitas

  Masing-masing return:
  ```json
  {
    "saldoAwal": 0,
    "saldoAkhir": 1931000,
    "namaAkun": "Petty Cash/Cash in Hand",
    "jenisPembantu": "Kas",
    "identitas": { "namaLembaga", "alamat" },
    "data": [
      {
        "bulan": "Januari", "tanggal": "2026-01-09",
        "noBukti": "021", "uraian": "...",
        "debet": 5000000, "kredit": 0, "saldoBerjalan": 5000000,
        "sumberKas": "Kas di Bank"  // hanya untuk BP Bahan/Operasional/Fasilitas
      }
    ]
  }
  ```

  Logika arah debet/kredit (perbaikan dari BP lama):
  - **Untuk akun KAS**: MASUK = debet, KELUAR = kredit (sekarang sudah benar)
  - **Untuk akun DANA**: MASUK (dana masuk) = kredit (sumber dana bertambah), KELUAR (penggunaan) = debet? — perlu cek Excel
    - Di Excel: Dana Bahan Baku — penerimaan (row 11: 135306000) = Debet, pengeluaran = Kredit
    - Jadi DANA: MASUK = Debet (+), KELUAR = Kredit (-) — sama dengan KAS
  - **Untuk akun BIAYA**: KELUAR = Debet (+ biaya), MASUK = Kredit (- biaya)
    - Di Excel: Biaya Bahan Baku — row 18: 3912000 = Kredit
    - Jadi BIAYA: KELUAR = Debet (biaya bertambah), MASUK = Kredit

  **Simplifikasi**: filter query langsung berdasarkan akunKasId OR akunDanaBiayaId, lalu terapkan logika debet/kredit sesuai tipe akun.

- [ ] **Task 4b: Frontend — ganti BP generic jadi 4 opsi spesifik di dropdown LaporanPage**
  - Hapus opsi "Buku Pembantu per Akun (BP)" dari dropdown
  - Tambah 4 opsi: "BP - Kas", "BP - Bahan Baku", "BP - Operasional", "BP - Insentif Fasilitas"
  - Hapus dropdown akun raw (yang tampil kode [1101] Petty Cash...)
  - Navigasi: `/akuntan/laporan/bp-kas`, `/akuntan/laporan/bp-bahan-baku`, etc.
  - 1 komponen reusable `BukuPembantuTable` yang menerima props: `{ data, saldoAwal, saldoAkhir, namaAkun, jenisPembantu, showKeterangan }`
  - BP Kas: showKeterangan=false (tanpa kolom Keterangan)
  - BP lain: showKeterangan=true

- [ ] **Task 4c: PDF untuk semua BP**
  - Template HTML PDF untuk BP (mirip BKU tapi judul "BUKU PEMBANTU ...")
  - Tombol "Preview PDF" di setiap BP

### B.5 — Sheet "Catatan" (Rename — setelah B.3 selesai)

Excel layout:
```
CATATAN PENGELUARAN BULANAN
Periode : 8-17 Januari
Nama Lembaga / Alamat
Ringkasan (sisa dana lalu, diterima, tersedia, biaya3, total, sisa)
Bulan | Tgl | No. Bukti | Uraian Transaksi | Jumlah
1     | 2   | 3         | 4                 | 5
(hanya KELUAR)
```

Ini adalah format BKU **lama** (hanya kredit, tanpa debet/saldo). Setelah B.3 memperbaiki BKU ke format debet/kredit/saldo, sheet ini perlu rename.

- [ ] **Task 5: Setelah B.3 selesai**
  - Rename judul BKU PDF dari "BUKU KAS UMUM" → "CATATAN PENGELUARAN BULANAN"
  - Simpan template lama sebagai format Catatan (filter kredit saja, kolom Jumlah)
  - Bikin template baru untuk BKU yang benar (debet/kredit/saldo)
  - Atau: buat 2 endpoint PDF: `/bku/pdf` (format baru) dan `/catatan/pdf` (format lama)

### B.6 — Sheet "LR" (Laporan Resume Penerimaan-Pengeluaran)

Excel layout:
```
LAPORAN/RESUME PENERIMAAN DAN PENGELUARAN
Periode : 8-17 Januari 2026
Nama Lembaga / Alamat

URAIAN                     | Jml Periode sblm | On Going | Jumlah
PENERIMAAN:
  Dana Bahan Baku          | 0               | 135306000 | 135306000
  Dana Operasional         | 0               | 274694000 | 274694000
  Dana Insentif Fasilitas  | 0               | 90000000  | 90000000
  Pungutan PPN             | 0               | 0         | 0
  ...                      | ...             | ...       | ...
  TOTAL PENERIMAAN         | 0               | 500000000

PENGELUARAN:
  Biaya Bahan Baku         | 0               | 120206400 | 120206400
  Biaya Operasional        | 0               | 87278932  | 87278932
  Biaya Insentif Fasilitas | 0               | 90000000  | 90000000
  Biaya Lainnya            | 0               | 0         | 0
  TOTAL PENGELUARAN        | 0               | 297485332

BUKU KAS UMUM              | 0               | 202514668
  Petty Cash/Cash in Hand  | 0               | 1931000   | 1931000
  Kas di Bank              | 0               | 200583668 | 200583668
                                                       | 202514668 (total)
Oke, Cocok

Tanda Tangan: Mengetahui (Kepala SPPG) | Sumedang, tgl (Akuntan)
```

- [ ] **Task 6a: Backend — bikin endpoint `GET /api/laporan/lr?periodeId=X`**
  - PENERIMAAN: SUM JurnalTransaksi WHERE jenis='MASUK' GROUP BY akunDanaBiaya.nama (kategori DANA)
  - PENGELUARAN: SUM JurnalTransaksi WHERE jenis='KELUAR' GROUP BY akunDanaBiaya.nama (kategori BIAYA)
  - BKU total: SUM saldoAkhir semua akun KAS
  - Response: `{ penerimaan: [{ label, periodeSebelumnya, onGoing, jumlah }], pengeluaran: [...], totalPenerimaan, totalPengeluaran, bukuKasUmum, pettyCash, kasDiBank, verifikasi: "Oke, Cocok", identitas }`

- [ ] **Task 6b: Frontend — pindah LR dari halaman Dokumen Resmi ke LaporanPage dropdown**
  - Tambah opsi "LR (Laporan Resume)" di dropdown LaporanPage
  - Render tabel LR sesuai layout Excel (Penerimaan section, Pengeluaran section, BKU section)
  - PDF preview untuk LR

- [ ] **Task 6c: Hapus opsi LR dari halaman Dokumen Resmi**
  - Hapus option LR dari Dropdown jenis dokumen di DokumenResmiPage.jsx
  - Hapus logika `else if (jenisDokumen === 'LR')` di generate function

### B.7 — Sheet "Pemeriksaan Bahan Makanan" (FITUR BARU — Form Inspeksi BGN)

Referensi file: `D:\PEMERIKSAAN BAHAN P12 ( 8-20 juni 2026).xlsx`

**Aktor & Alur:**
```
Akuntan buat PO (berdasar kebutuhan SISWA/B3)
  → Mitra beli, update realisasi (harga aktual) → PO status DIREALISASI
    → Aslap generate form Pemeriksaan Bahan (cetak)
      → Aslap cek fisik barang + isi manual (kualitas, waktu, ttd)
        → Aslap konfirmasi "DITERIMA" via PUT /aslap/po/:id/approve
```

**Sumber data:** PO items (`TransaksiPembelianItem`) yang sudah `DIREALISASI`. qty SISWA/B3 dihitung ulang dari kebutuhan menu (endpoint `GET /mitra/po/kebutuhan`) karena PO cuma simpan `qtyTotal`.

**User:** Aslap (bukan Akuntan). TTD form atas nama Kepala SPPG.

Excel layout exact:
```
BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)
Gedung E Kompleks Kementrian Pertanian
Jalan Harsono RM Nomor 3 Ragunan, Pasar Minggu Jakarta 12550

FORMAT PEMERIKSAAN BAHAN MAKANAN
No. {counter}/{tgl}/ VI/ 2026
Nama SPPG : SPPG SUMEDANG UJUNGJAYA PALABUAN
ID SPPG : ZEZ3TM0G

No | Waktu Pemeriksaan | Tanggal Pemeriksaan | Bahan Makanan | SISWA{tgl} | B3{tgl} | QTY | Satuan | Sesuai | Tidak | Baik | Rusak | Suplier | Alamat
1   |                   |                     | Beras          | 137        |         | 137 | KG     |        |       |      |       |        |
2   |                   |                     | Telur ayam     | 113        |         | 113 | KG     |        |       |      |       |        |
...

                                     Sumedang, {tgl} Juni 2026
                                     Kepala Satuan Pelayanan Pemenuhan Gizi
                                     [ttd]
                                     Yayang Badruddin, S.E
```

14 kolom:
| # | Kolom | Tipe | Cara Isi |
|---|-------|------|----------|
| A | No | Auto | Nomor urut otomatis |
| B | Waktu Pemeriksaan | Manual | Jam periksa (dikosongkan, isi setelah cetak) |
| C | Tanggal Pemeriksaan | Manual | Tgl periksa (dikosongkan) |
| D | Bahan Makanan | Auto | Nama bahan dari BahanPokok |
| E | SISWA{tgl} | Auto | Qty siswa dari kebutuhan (hitung ulang dari menu) |
| F | B3{tgl} | Auto | Qty B3 dari kebutuhan (hitung ulang dari menu) |
| G | QTY | Formula | E + F |
| H | Satuan | Auto | KG/LITER/PCS dari BahanPokok |
| I | Sesuai | Manual | Isi setelah cetak (kualitas sesuai spesifikasi?) |
| J | Tidak | Manual | Isi setelah cetak |
| K | Baik | Manual | Isi setelah cetak (kondisi baik?) |
| L | Rusak | Manual | Isi setelah cetak |
| M | Suplier | Auto | Nama supplier dari PO |
| N | Alamat | Auto | Alamat supplier dari DB Supplier |

Kolom I–L dikosongkan (isi manual setelah cetak). Kolom M–N diisi otomatis dari data PO/supplier.

- [ ] **Task 7a: Tentukan sumber data detail**
  - qty SISWA/B3 → hitung ulang dari kebutuhan menu (panggil logic `GET /mitra/po/kebutuhan`) untuk tanggal tsb
  - Supplier → dari PO (`TransaksiPembelian.supplier`)
  - Bahan + satuan → dari `TransaksiPembelianItem.bahanPokok`
  - TTD → dari `SetupLembaga` / `User` Kepala SPPG

- [ ] **Task 7b: Backend — endpoint data Pemeriksaan Bahan**
  - `GET /api/laporan/pemeriksaan-bahan?poId=xxx`
  - Cari `TransaksiPembelian` + `items` + `supplier` by poId
  - Hitung qty SISWA/B3 per item dari data kebutuhan (reuse logic dari `GET /mitra/po/kebutuhan`)
  - Sertakan identitas lembaga + ID SPPG
  - Response:
    ```json
    {
      "nomorDokumen": "...",
      "poId": "...",
      "supplier": { "nama": "...", "alamat": "..." },
      "identitas": { "namaLembaga": "SPPG SUMEDANG UJUNGJAYA PALABUAN", "idSppg": "ZEZ3TM0G" },
      "bahan": [
        { "no": 1, "nama": "Beras", "qtySiswa": 137, "qtyB3": 0, "qty": 137, "satuan": "KG" }
      ],
      "ttd": { "tempat": "Sumedang", "tanggal": "9 Juni 2026", "kepalaSPPG": "Yayang Badruddin, S.E" }
    }
    ```

- [ ] **Task 7c: Backend — PDF Pemeriksaan Bahan**
  - `GET /api/laporan/pemeriksaan-bahan/pdf?poId=xxx`
  - Template HTML PDF — layout exact Excel:
    - Kop BGN (logo + nama + alamat)
    - Judul: "FORMAT PEMERIKSAAN BAHAN MAKANAN"
    - No. dokumen, Nama SPPG, ID SPPG
    - Tabel 14 kolom (header + baris data)
    - Kolom B-C (waktu/tgl periksa) + I-L (kualitas) = sel kosong untuk isi manual
    - Kolom M-N (supplier) = terisi otomatis
    - Footer TTD: Kepala SPPG

- [ ] **Task 7d: Frontend — halaman Aslap**
  - Di halaman Aslap (`/aslap/po` atau halaman terpisah `/aslap/pemeriksaan-bahan`)
  - Tampilkan daftar PO status `DIREALISASI` → tombol "Cetak Pemeriksaan Bahan"
  - Klik → preview PDF form Pemeriksaan Bahan
  - Setelah cek fisik → Aslap klik "Konfirmasi DITERIMA" (endpoint existing `PUT /aslap/po/:id/approve`)

- [ ] **Task 7e: Nomor dokumen**
  - Format pola Excel: `No.{counter}/{tgl}/ VI/ {tahun}`
  - Counter = auto-increment per bulan? atau per tahun? Lihat pola Excel:
    - `No.10/9/VI/2026`, `No.11/10/VI/2026`, `No.12/11/VI/2026`, `No.13/14/VI/2026`, `No.14/17/VI/2026`, `No.15/18/VI/2026`
    - Counter naik 1 setiap dokumen, ada duplikat 13 (dipake 2x) — kayaknya **manual dari user**
    - **Saran:** Auto dari DB counter per bulan. Atau biarkan user isi manual di form.

### B.8 — Sheet "BP Pajak" (Kolom kolom)

Excel layout (BP Pajak — sheet diabaikan sebelumnya karena 0 data, tapi di Excel sheet ini ada 2811 baris, cols=13):
- Belum diekstrak layoutnya. Perlu dicek apakah ada data atau benar-benar kosong.
- Skip dulu, prioritas rendah.

### B.9 — SaldoAwalBarang: gap UX

**Latar:** Kolom sudah fully covered (No, Nama Barang, Satuan, Saldo Awal, Harga Beli Awal). Tapi ada gap pada UX dan data flow.

Referensi Excel: `Lap.Keu P1 8-17 jan 2026.xlsx` sheet **Saldo_Brg**

- [ ] **Task 9a: Backend — tambah endpoint PUT & DELETE `saldo-awal-barang/:id`**
  - PUT: update `saldoAwalQty` dan/atau `hargaBeliAwal`
  - DELETE: hapus record saldo awal per id
  - Saat ini hanya POST (create) + GET (list) — kalo salah input, tidak bisa diedit/dihapus

- [ ] **Task 9b: Backend — tambah endpoint POST `saldo-awal-barang/bulk`**
  - Body: `{ periodeId, items: [{ bahanPokokId, saldoAwalQty, hargaBeliAwal }] }`
  - Bulk upsert: insert/update array items dalam 1 request
  - Untuk impor data dari Excel (200+ baris)

- [ ] **Task 9c: Frontend — tombol edit/hapus per baris di tabel**
  - Edit: klik baris → form terisi → submit PUT
  - Hapus: konfirmasi → DELETE
  - Tampilkan header identitas (Nama SPPG + Periode) di atas tabel, seperti Excel

- [ ] **Task 9d: Frontend — fitur upload Excel / bulk input**
  - Upload file .xlsx → parse → bulk POST `/saldo-awal-barang/bulk`
  - Atau input multiple baris dalam 1 form (tambah baris dinamis)

### B.10 — Jurnal Transaksi: gap UI & nomor bukti

**Latar:** Kolom fully covered (Bulan, Tgl, No.Bukti, Uraian, Debet/Kredit, Akun Dana/Biaya, Akun Kas, Catatan). Gap di UX dan nomor urut.

Referensi Excel: `Lap.Keu P1 8-17 jan 2026.xlsx` sheet **Transaksi** (123 entry, Bukti 001-123)

- [ ] **Task 10a: Frontend — tambah tombol Edit per baris Jurnal**
  - PUT endpoint sudah ada (1139 baris kode di `akuntan.js`), frontend cuma Create + Delete
  - Klik edit → form terisi data existing → submit PUT
  - Saat ini kalau salah input harus hapus bikin ulang

- [ ] **Task 10b: Frontend — prefll dari PO auto-pilih Akun**
  - Saat ini prefll isi tanggal, uraian, nominal — tapi `akunDanaBiayaId` dan `akunKasId` kosong
  - Cari mapping: dari `akunDanaBiaya.kategoriDana` (dari PO items → BIAYA) dan `akunKas` default
  - Atau simpan referensi akun di PO / Supplier

- [ ] **Task 10c: Nomor Bukti — reuse nomor yang dihapus atau tetap berurutan?**
  - Sistem: `MAX(nomorBukti)+1` per periode → kalau ada delete, nomor jadi bolong
  - Excel rapat 001-123 tanpa gap
  - Putuskan: isi ulang gap (tambah logic `find missing nomor`) atau biarkan bolong? Tanya user

- [ ] **Task 10d: Backend — tambah pagination di GET `/jurnal-transaksi`**
  - Saat ini return semua jurnal per periode tanpa `skip`/`take`
  - OK untuk 123 entry, tapi untuk periode panjang perlu pagination

### B.11 — Periode Setup: status management & edit

**Latar:** Excel Setup sheet sudah fully covered (semua field lembaga & pejabat). Tapi sebagai fitur sistem, Periode cuma create-only — tidak ada management lifecycle.

- [ ] **Task 11a: Backend — endpoint PUT `/periode/:id` + PATCH `/periode/:id/status`**
  - PUT: update periode + setupLembaga (tanggal, pagu, data lembaga)
  - PATCH: transisi status DRAFT → AKTIF → SELESAI
  - Validasi: tidak bisa ubah periode yang sudah SELESAI

- [ ] **Task 11b: Frontend — tambah `totalDanaDiterima` di form**
  - Field sudah ada di schema (nullable), backend accept, tapi frontend tidak punya
  - Input Number Rupiah, opsional

- [ ] **Task 11c: Frontend — ubah halaman jadi management page**
  - Tambah daftar periode (table) + tombol Edit per baris
  - Status badge + tombol ubah status (Aktifkan/Selesaikan)
  - Route: `/akuntan/laporan/periode-setup` atau halaman terpisah

### B.12 — [BARU] Redesain Tab "RAB Harian" jadi Rencana Bahan Harian (RAB P12)

**Latar:** Tab RAB Harian saat ini hanya daftar RabHarian kosong (container PO). Padahal sistem sudah punya data menu DISETUJUI + penerima manfaat yang bisa dikalkulasi jadi **kebutuhan bahan per hari** — mirip Excel `RAB P12 (8juni-20juni 2026).xlsx`.

**Alur baru:**
```
Menu Ahli Gizi (DISETUJUI) × Input Penerima Manfaat
        │
        ▼
TAB RAB HARIAN (redesain) — budget planning + approval
  ─ Pagu harian dari jumlah penerima × batas porsi
  ─ Daftar bahan (dari MenuItemBahan × porsi) dengan qty, harga, jumlah
  ─ Total & sisa per hari
  ─ ACC / approve RAB
        │
        ▼
PO (halaman terpisah) — eksekusi
  ─ Data RAB yg sudah ACC masuk otomatis ke form PO
  ─ Akuntan pilih supplier, cetak Nota Pesanan
```

**Data:** sudah ada di `MenuItemBahan.beratKotorGr` + `InputPenerimaManfaatDetail.jumlahPenerima` + `HargaBahanPeriode.harga`. Sama seperti auto-fill PO page, tapi ditampilkan sebagai laporan perencanaan.

Referensi Excel: `D:\RAB P12 (8juni-20juni 2026).xlsx`

- [ ] **Task 12a: Backend — endpoint `GET /api/akuntan/rab-p12/harian?periodeId=X&tanggal=Y`**
  - Reuse logika `GET /mitra/po/kebutuhan` yang sudah hitung qtySiswa, qtyB3, hargaSatuan per bahan
  - Tambah pagu harian: `SUM(jumlahPenerima per kategori × batasPorsi)` split KECIL/Rp8k & BESAR/Rp10k
  - Return:
    ```json
    {
      "tanggal": "2026-06-10",
      "pagu": 16012000,
      "totalBiaya": 16003450,
      "sisa": 8550,
      "bahan": [
        { "nama": "Beras", "satuan": "KG", "qtySiswa": 137, "qtyB3": 0, "qtyTotal": 137, "hargaSatuan": 15000, "jumlah": 2055000 }
      ]
    }
    ```

- [ ] **Task 12b: Backend — endpoint `GET /api/akuntan/rab-p12/rekap?periodeId=X`**
  - Agregasi seluruh hari dalam periode
  - Per hari: pagu, totalBiaya, sisa
  - Total: totalPagu, totalBiaya, totalSisa
  - Sama seperti sheet REKAP di Excel RAB P12

- [ ] **Task 12c: Frontend — ubah tab "RAB Harian" di RabHarianPage.jsx**
  - Ganti dari daftar RabHarian (daftar tanggal + status) jadi antarmuka RAB P12:
    - **Pilih Tanggal** → tampil Pagu, Total Bahan, Sisa
    - **Tabel bahan**: Nama | Satuan | Qty SISWA | Qty B3 | Qty Total | Harga Satuan | Jumlah
    - **Tombol "Ajukan RAB"** → ubah status jadi DIAJUKAN → notif ke Kepala SPPG
    - **Status badge** (DRAFT/DIAJUKAN/DISETUJUI/DITOLAK)
    - **Tombol "Ajukan Approval"** → hanya muncul jika status DRAFT
  - Integrasi approval: jika DISETUJUI → muncul tombol "Buat PO dari RAB ini"

- [ ] **Task 12d: Frontend — tambah ringkasan rekap di tab RAB Harian**
  - Di bawah tabel harian, tampilkan REKAP periode:
    - Tabel: Tanggal | Pagu | Total Biaya | Sisa | Status
    - Total baris: total pagu, total biaya, total sisa
  - Filter by date range

- [ ] **Task 12e: Tombol "Buat PO dari RAB" navigasi ke PO page**
  - Saat RAB sudah DISETUJUI, tombol navigasi ke `/akuntan/po?tanggal=Y`
  - Data kebutuhan bahan sudah otomatis terisi di form PO (karena PO page sudah auto-fill dari endpoint yg sama)

### B.13 — [BARU] RAB → PO: alur approval & eksekusi

**Latar:** Setelah RAB Harian di-ACC, data harus mengalir ke PO untuk eksekusi. Sekarang PO page auto-fill langsung dari menu tanpa melalui status RAB.

- [ ] **Task 13a: Backend — tambah field `status` dan `approvedAt` di RabHarian response**
  - Saat ini RabHarian sudah punya `status: StatusApproval` dan `approvals[]`
  - Pastikan `GET /mitra/po/kebutuhan` hanya return data jika `RabHarian.status = DISETUJUI`
  - Jika belum DISETUJUI, return error: "RAB harian untuk tanggal ini belum disetujui"

- [ ] **Task 13b: Frontend PO page — validasi RAB harus DISETUJUI**
  - Saat pilih tanggal di PO form, cek status RabHarian
  - Jika belum DISETUJUI, tampilkan pesan: "RAB harian tanggal ini belum disetujui. Buka tab RAB Harian untuk mengajukan approval."
  - Jika DISETUJUI, form PO bisa diisi

- [ ] **Task 13c: Approval flow dari RAB**
  - Tab RAB Harian: status DRAFT → tombol "Ajukan" → DIAJUKAN → notif ke Kepala SPPG
  - Kepala SPPG approve via halaman approval (mekanisme existing)
  - Setelah DISETUJUI: RAB terkunci, data siap di-PO

### B.14 — [BARU] Laporan Harian (Realisasi Penggunaan Dana)

**Latar:** Excel `LAP_hari-minggu-bulan 25MEI-20JUNI 2026.xlsx` sheet 1-2 berisi **Laporan Harian Penggunaan Dana** — per hari: penerima manfaat per sekolah/posyandu (split L/P) + rincian belanja bahan + biaya ops & insentif + tanda tangan. Data mentah sudah ada di sistem, belum ada laporan agregatnya.

**Format Excel per hari:**
```
LAPORAN HARIAN PENGGUNAAN DANA PROGRAM MBG TA 2026
SPPG Sumedang Ujungjaya Palabuan — 25 Mei 2026

A. PESERTA DIDIK
Kelompok        | Sekolah         | L | P | Jml
PAUD/TK         | TK Amanah       | 12| 13| 25
SD Kelas 1-3    | SDN Wanajaya    | 30| 28| 58
...

B. NON PESERTA (B3)
Balita          | Posyandu Cempaka| 10| 12| 22
...

C. RINCIAN PEMBELANJAAN
Bahan Baku Pangan:
  Beras       | 137 KG  | Rp15.000 | Rp2.055.000
  Daging Ayam |  68 KG  | Rp35.000 | Rp2.380.000
  ...
Biaya Operasional:                             Rp67.022.000
Biaya Insentif Fasilitas:                      Rp84.000.000

Pihak Pertama (Mitra)    | Staf Pengawas Keuangan | Kepala SPPG
Dizhar Priatama          | Windi Amelia W., S.Ak  | Yayang Badruddin, S.E
```

**Data sumber:**
- ✅ Penerima per sekolah/posyandu: `InputPenerimaManfaatDetail.lakiLaki` + `.perempuan` per `sekolahId` / `posyanduId`
- ✅ Rincian belanja bahan: `TransaksiPembelianItem` (qty, hargaSatuan, subtotal) via `TransaksiPembelian.tanggal`
- ✅ Biaya Ops & Insentif: `JurnalTransaksi` WHERE akunDanaBiaya.kategoriDana = OPERASIONAL / INSENTIF_FASILITAS
- ✅ Tanda tangan: `SetupLembaga.namaAkuntanSPPG`, `User.nama` role MITRA & KEPALA_SPPG

- [ ] **Task 14a: Backend — endpoint `GET /api/laporan/harian?periodeId=X&tanggal=Y`**
  - **A. PESERTA DIDIK:** query `InputPenerimaManfaatDetail` + `Sekolah` + `KategoriPenerima` untuk tanggal tsb
    - Cari `InputPenerimaManfaat` where `periodeId` AND `hariAktif` includes dayOfWeek(tanggal)
    - Group by kategori (PAUD_TK, SD_1_3, SD_4_6, SMP_1_3, SMA_SMK_4_6, ATS_KURANG_9TH, ATS_9_18TH, PENDIDIK, TENAGA_KEPENDIDIKAN)
    - Per kategori: list per sekolah dg L/P/Jml
  - **B. NON PESERTA (B3):** sama, filter kategori BALITA, BUMIL, BUSUI, KADER_POSYANDU, group by posyandu
  - **C. RINCIAN:** 
    - Belanja bahan: SUM `TransaksiPembelianItem` per `bahanPokok` WHERE `TransaksiPembelian.tanggal` = target date
    - Biaya Ops: SUM `JurnalTransaksi.nominal` WHERE tanggal = target AND kategoriDana = OPERASIONAL
    - Biaya Insentif: SUM JurnalTransaksi WHERE tanggal = target AND kategoriDana = INSENTIF_FASILITAS
  - Sertakan identitas lembaga + nama pejabat untuk TTD
  - Response:
    ```json
    {
      "tanggal": "2026-05-25",
      "identitas": { "namaLembaga": "...", "alamat": "..." },
      "pesertaDidik": [
        {
          "kategori": "PAUD/TK", "kategoriId": "...",
          "sekolah": [
            { "nama": "TK Amanah", "lakiLaki": 12, "perempuan": 13, "jumlah": 25 }
          ]
        }
      ],
      "nonPeserta": [
        {
          "kategori": "Balita",
          "posyandu": [
            { "nama": "Cempaka 1", "lakiLaki": 10, "perempuan": 12, "jumlah": 22 }
          ]
        }
      ],
      "pembelanjaan": {
        "bahanBaku": [
          { "bahan": "Beras", "satuan": "KG", "qty": 137, "hargaSatuan": 15000, "jumlah": 2055000 }
        ],
        "biayaOperasional": 67022000,
        "biayaInsentifFasilitas": 84000000,
        "totalPembelanjaan": 153022000
      },
      "ttd": {
        "mitra": "Dizhar Priatama",
        "akuntan": "Windi Amelia Winengsih, S.Ak",
        "kepalaSPPG": "Yayang Badruddin, S.E"
      }
    }
    ```

- [ ] **Task 14b: Frontend — tambah opsi "Laporan Harian" di LaporanPage dropdown**
  - Value: `'LAPORAN_HARIAN'`
  - Navigasi ke `/akuntan/laporan/harian`
  - Form filter: Periode + Pilih Tanggal
  - Render:
    - Header: judul + identitas lembaga + tanggal
    - Section A: tabel PESERTA DIDIK (kelompok | sekolah | L | P | Jml) + total
    - Section B: tabel NON PESERTA (B3) (kategori | posyandu | L | P | Jml) + total
    - Section C: tabel RINCIAN PEMBELANJAAN (bahan | qty | satuan | harga | jumlah) + biaya ops/insentif + grand total
    - Footer TTD: 3 kolom tanda tangan (Mitra | Akuntan | Kepala SPPG)
  - Tombol "Preview PDF"

- [ ] **Task 14c: Template PDF Laporan Harian**
  - `backend/src/templates/dokumen/laporanHarian.js`
  - Layout exact Excel: kop surat, tabel penerima (A+B), tabel pembelanjaan (C), footer TTD
  - Endpoint: `GET /api/laporan/harian/pdf?periodeId=X&tanggal=Y`

### B.15 — [BARU] LRA (Laporan Realisasi Anggaran) + LAP Bulanan + LPD2M

**Latar:** Excel `LAP_hari-minggu-bulan 25MEI-20JUNI 2026.xlsx` sheet 3,6,9,10 berisi 3 laporan terkait yang bisa digabung jadi 1 fitur:

| Sheet | Nama | Fungsi |
|-------|------|--------|
| 3,6 | **LRA** | Realisasi Anggaran per periode: PENDAPATAN vs BELANJA = SURPLUS/DEFISIT |
| 9 | **LPD2M** | Rekap multi-periode (P11+P12): Saldo Awal, Penerimaan, Belanja, Sisa |
| 10 | **LAP Bulanan** | Laporan bulanan formal cover 2 periode + ttd |

**Sistem sudah punya:**
- ✅ LR (Laporan Resume) — mirip LRA tapi tanpa PENDAPATAN dan SURPLUS/DEFISIT
- ✅ LPA — per-periode, bisa di-extend untuk multi-periode
- ✅ Data: `Periode.totalDanaDiterima`, `AnggaranHarian`, `JurnalTransaksi`

- [ ] **Task 15a: Backend — endpoint `GET /api/laporan/lra?periodeId=X` (LRA per periode)**
  - Modifikasi dari LR existing:
    - PENDAPATAN: `Periode.totalDanaDiterima` (dari BGN) + potensi dari Yayasan/Lainnya (0 jika tidak ada)
    - BELANJA: SUM `AnggaranHarian.aktual` per kategoriDana (BAHAN_MAKANAN, OPERASIONAL, INSENTIF_FASILITAS)
    - SURPLUS/DEFISIT: Total PENDAPATAN - Total BELANJA
  - Response:
    ```json
    {
      "periodeLabel": "25 Mei - 6 Juni 2026",
      "pendapatan": {
        "dariBGN": 367682750,
        "dariYayasan": 0,
        "dariLainnya": 0,
        "totalPendapatan": 367682750
      },
      "belanja": {
        "bahanPangan": { "diajukan": 180975600, "terealisasi": 180975600 },
        "operasional": { "diajukan": 126058289, "terealisasi": 126058289 },
        "sewa": { "diajukan": 60000000, "terealisasi": 60000000 },
        "totalBelanja": 367033889
      },
      "surplusDefisit": 648861,
      "ttd": { "kepalaSPPG": "...", "akuntan": "..." }
    }
    ```

- [ ] **Task 15b: Frontend — opsi "LRA (Realisasi Anggaran)" di LaporanPage**
  - Value: `'LRA'`
  - Render tabel: PENDAPATAN section, BELANJA section, SURPLUS/DEFISIT
  - Tombol "Preview PDF"

- [ ] **Task 15c: Backend — endpoint `GET /api/laporan/rekap-bulanan?periodeIds[]=X&periodeIds[]=Y` (LPD2M multi-periode)**
  - Terima array periodeId (misal P11 + P12)
  - Agregasi per periode: Saldo Awal (sisa periode sebelumnya), Penerimaan, Belanja per kategori, Total, Sisa
  - Response:
    ```json
    {
      "periode": [
        {
          "label": "25 Mei - 6 Juni 2026",
          "saldoAwal": 367682750,
          "penerimaan": 367682750,
          "belanja": { "bahanPangan": 180975600, "operasional": 126058289, "sewa": 60000000, "total": 367033889 },
          "sisa": 648861
        },
        { "...period 12..." }
      ],
      "grandTotal": {
        "penerimaan": 874266889,
        "belanja": 772611029,
        "sisa": 101655860
      }
    }
    ```

- [ ] **Task 15d: Frontend — opsi "Rekap Bulanan (LPD2M)" di LaporanPage**
  - Multi-select periode (checkboxes)
  - Render tabel gabungan dengan grand total
  - Tombol "Preview PDF"

- [ ] **Task 15e: Frontend — ganti / perluas halaman Dokumen Resmi untuk LAP Bulanan**
  - Tambah jenis dokumen "LAP Bulanan" di dropdown DokumenResmiPage
  - Format: mirip LPA tapi multi-periode + cover 2 ttd (Pihak Pertama + Mengetahui)
  - Nomor dokumen format: `06/LPA/VI/2026` (manual / auto)
  - Endpoint: reuse LPA dengan flag multi-periode atau endpoint baru

- [ ] **Task 15f: Template PDF LRA + LAP Bulanan**
  - `templates/dokumen/lra.js` — format realisasi anggaran
  - `templates/dokumen/lapBulanan.js` — format laporan bulanan formal
  - Layout ikuti Excel (kop, tabel, footer ttd)

---

## C. Tugas Non-Bloking (Setelah B.1–B.15)

_Cadangan, prioritas rendah_

### C.1 — Tambah PDF Preview untuk semua laporan
- Setiap jenis laporan di LaporanPage harus punya tombol "Preview PDF"
- Template HTML PDF untuk masing-masing (ikut layout Excel)

### C.2 — Halaman "Catatan Pengeluaran Bulanan" terpisah
- Setelah B.3 + B.5, buat halaman/endpoint khusus untuk Catatan (bisa di DokumenResmi atau LaporanPage)

### C.3 — [BARU] PDF RAB P12
- Template PDF untuk cetak RAB P12 per hari atau per periode
- Layout mengikuti Excel (kop, tabel bahan, pagu, sisa, rekap)
- Tombol "Preview PDF" di tab RAB Harian

### C.4 — [BARU] Notifikasi ke Mitra saat RAB disetujui
- Setelah RAB DISETUJUI, notif ke Mitra: "RAB tanggal Y sudah disetujui, silakan cek PO"
- Mitra bisa lihat estimasi kebutuhan bahan sebelum PO resmi dibuat

---

---

## Z. Keputusan yang Belum Diambil (Open Decisions)

### Z.1 — Sumber data QTY SISWA & B3 (Task 7a)
**Masalah:** Form Pemeriksaan Bahan perlu qty per bahan (split SISWA vs B3). PO cuma simpan `qtyTotal`.

**Keputusan:** Hitung ulang dari **kebutuhan menu** — panggil logic `GET /mitra/po/kebutuhan` untuk tanggal tsb, map per bahan.
- PO items = daftar bahan yang dibeli
- Kebutuhan = qty SISWA + qty B3 per bahan per tanggal
- Supplier = dari TransaksiPembelian

**Alasan:** qty SISWA/B3 adalah data perencanaan (bukan aktual terima), sesuai fungsi form = verifikasi kiriman vs rencana.

### Z.2 — Nomor Dokumen Pemeriksaan Bahan (Task 7e)
**Masalah:** Pola nomor tidak konsisten antar sheet Excel:
- `No.10/9/VI/2026`, `No.11/10/VI/2026`, `No.12/11/VI/2026` — counter naik +1 per dokumen
- Tapi `No.13` dipakai 2x (tanggal 14 dan 16), `No.14` loncat, dst

**Pola:** `No.{counter}/{tanggal}/VI/{tahun}` — counter naik manual atau auto counter per bulan. Ada duplikat → kemungkinan **diisi manual user** (bukan auto counter).

**Saran:** Auto counter per bulan dari DB. Atau user isi manual di form saat generate. Tanya user preferensi.

### Z.3 — Placement halaman Pemeriksaan Bahan (Task 7d)
**Keputusan:** Di **halaman Aslap** (`/aslap/po` atau halaman dedicated `/aslap/pemeriksaan-bahan`). Bukan di LaporanPage Akuntan.
- User = Aslap, bukan Akuntan
- Form digenerate per PO (bukan per hari), dari daftar PO status `DIREALISASI`

### Z.4 — Batch cetak atau per PO?
**Keputusan:** **Per PO** — karena 1 PO = 1 supplier = 1 form. 1 hari bisa punya beberapa PO (beda supplier).**Tidak batch range tanggal.**
- Aslap lihat daftar PO DIREALISASI → klik "Cetak" per PO → PDF 1 form
- Kecuali nanti ada fitur cetak multiple PO terpilih

### Z.5 — Validasi Stok: perlu akses KEPALA_SPPG?
**Masalah:** Saat ini Validasi Stok hanya untuk AKUNTAN. Kepala SPPG adalah penandatangan form, tapi tidak bisa lihat.
- **Saran:** Tidak urgent — Aslap yang cek fisik pakai form Pemeriksaan Bahan (B.7), bukan Validasi Stok. Validasi Stok tetap urusan Akuntan.
- Bisa ditambah read-only nanti jika diperlukan.

### Z.6 — BP Pajak (B.8) perlu ditindaklanjuti?
**Masalah:** Sheet BP Pajak punya 2811 baris × 13 kolom tapi tidak ada data (0 semua). Apakah perlu diimplementasikan?

### Z.7 — Format nomor dokumen Pemeriksaan Bahan
**Pola Excel:** `No.{counter}/{tanggal}/VI/{tahun}`
- Counter = nomor urut (naik per dokumen)
- Ada duplikat 13 → kemungkinan **manual dari user**, bukan auto

**Saran:** Buat auto counter per bulan di DB dengan tabel `CounterDokumen`. Tapi bisa juga user isi manual di form generate (default counter dari DB + bisa diedit). Tanya user.

### Z.8 — Redesain Tab RAB Harian: daftar RabHarian dipindah ke PO page
**Masalah:** Tab RAB Harian saat ini isinya daftar RabHarian (tanggal + status + jumlah PO) — tipis. Mulai sekarang RAB Harian fokus ke **perencanaan bahan** (RAB P12).

**Keputusan:** Tab RAB Harian di-redesain total jadi antarmuka RAB P12 (daftar bahan per hari dari menu × porsi). Daftar RabHarian (daftar container PO) tidak ditampilkan lagi di sini — fungsinya pindah ke PO page yang sudah menampilkan PO per tanggal dengan detail item.

**Dampak:**
- Tab RAB Harian: sekarang fokus ke **perencanaan + approval** (bahan apa, berapa, setuju?)
- PO page: tetap untuk **eksekusi** (pilih supplier, cetak PO)
- Alur: RAB ACC → PO execute — tidak tumpang tindih

### Z.9 — BTT (Bukti Tanda Terima): perlu diimplementasikan?
**Masalah:** Excel `LAP_hari-minggu-bulan` sheets 4-5,7-8 berisi BTT — dokumen formal tanda terima dana dari BGN ke Mitra. Tidak ada model/template di sistem.

**Saran:** Skip dulu — ini dokumen offline yang ditandatangani manual. Formatnya sederhana (template statis) dan tidak terkait data sistem. Prioritas rendah.

---

## ✅ Clear — Sheet/ Fitur tanpa gap

**Sheets Excel** — kolom fully covered, gap non-struktural di B.9:
`Transaksi` (⚠️ B.10) | `Saldo_Brg` (⚠️ B.9) | `Masuk` | `Keluar` | `Stock_Brg` | `LPA` | `SPTJ` | `BAPSD` | `DafNom`

**Referensi baru yang sudah di-audit:**
- `D:\RAB P12 (8juni-20juni 2026).xlsx` (⚠️ B.12) — perencanaan bahan harian dari menu × porsi
- `D:\LAP_hari-minggu-bulan 25MEI-20JUNI 2026.xlsx` (⚠️ B.14 & B.15) — laporan harian realisasi + LRA + LAP Bulanan + LPD2M multi-periode

**Fitur sistem** yang tidak ada sheet Excel-nya (system-native):
- ✅ **Validasi Stok** (`/akuntan/validasi-stok`) — rekonsiliasi stok gudang (qty sistem vs fisik). Tidak ada sheet Excel terkait — murni fitur operasional sistem.
- ⏳ **Pemeriksaan Bahan BGN** (B.7) — akan dibuat berdasarkan file `PEMERIKSAAN BAHAN P12.xlsx`
