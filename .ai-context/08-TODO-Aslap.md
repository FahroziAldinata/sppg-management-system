# Daftar Tugas SPPG — Modul Asisten Lapangan (ASLAP) Juli 2026

Berdasarkan audit modul ASLAP terhadap file `D:\LAPORAN ASLAP BARU.xlsx`.

**Prinsip:** Excel adalah *source truth* — sistem harus mengakomodasi seluruh format dan data yang ada di Excel.

---

## A. Critical Gap — Data Model & Input (Prioritas Tertinggi)

### A.1 — Multi Grup Hari dalam Satu Periode

**Temuan Excel:** Setiap periode bisa punya **2-3 grup hari** dengan data penerima yang **BERBEDA**:

| Periode | Grup 1 | Grup 2 | Grup 3 |
|---------|--------|--------|--------|
| 7 | SENIN-JUMAT | SABTU | - |
| 8 | SENIN, SELASA, JUMAT | RABU-KAMIS | SABTU |
| 9 | SELASA-JUMAT | SENIN & SELASA | SABTU |
| 10 | SENIN-JUMAT | SABTU | (18-22 & SABTU 23) |
| 11 | SENIN-JUMAT 25-30 | SABTU | - |

Contoh (Periode 8): SDN Sukarasa II punya **47 siswa** di Grup 1 tapi **0** di Grup 2. Artinya sekolah tidak operasional penuh tiap hari.

**Sistem saat ini:** Satu `InputPenerimaManfaat` = satu set `hariAktif[]` untuk semua detail. Tidak bisa bedakan data per grup hari.

- [ ] **Task 1a: Ubah konsep input — 1 grup hari = 1 blok input**
  - Model `InputPenerimaManfaat` perlu field baru: `labelGrup` (string, misal "SENIN-JUMAT", "SABTU", "RABU-KAMIS")
  - Atau buat model `GrupHari` terpisah: `id, periodeId, label, hariAktif[]`
  - `InputPenerimaManfaat` di-*group* per `GrupHari` (FK `grupHariId`)
  - Overlap validation tetap jalan — hari dalam grup berbeda tidak boleh overlap

- [ ] **Task 1b: Frontend — UI multi grup hari**
  - Form input Penerima Manfaat: user pilih/tambah **grup hari** dulu (misal "Senin-Jumat")
  - Lalu input sekolah & data seperti biasa
  - User bisa tambah grup hari kedua ("Sabtu") dengan data berbeda
  - Tampilkan tab atau akordeon per grup hari

- [ ] **Task 1c: Backend — validasi total antar grup**
  - Validasi bahwa total penerima per sekolah tidak boleh melebihi total terdaftar (dari master data)
  - Beri warning jika ada lonjakan data antar grup

### A.2 — Pendidik Harus Dipisah dari Blok Sekolah

**Temuan Excel:** 
- Pendidik adalah **1 baris aggregated** (kolom sekolah = `-`), **bukan per sekolah**
- Nilai = 0 di semua periode yang ada
- Tenaga Kependidikan (PIC) tetap per sekolah ✅

**Sistem saat ini:** `schoolCategoriesMap` menempatkan `PENDIDIK` di dalam tiap blok sekolah (`PenerimaManfaatPage.jsx:40-43`).

- [ ] **Task 2a: Pisahkan PENDIDIK dari schoolCategoriesMap**
  - Hapus `PENDIDIK` dari array `schoolCategoriesMap`
  - Buat input **terpisah** untuk Pendidik (aggregated — satu field total L/P untuk semua sekolah)
  - Posisi: antara section ATS dan blok sekolah, atau setelahnya
  - Layout: seperti ATS — satu grup input L/P fixed

- [ ] **Task 2b: Sesuaikan backend**
  - Validasi: PENDIDIK tidak boleh punya `sekolahId` (jenisSasaran tetap PESERTA_DIDIK)
  - Pada laporan, Pendidik tampil sebagai satu baris aggregated

### A.3 — Label Hari Kustom

**Temuan Excel:** Label grup hari tidak selalu `"SENIN-JUMAT"` atau `"SABTU"`:
- `"SENIN SLASA JUMAT"` (typo)
- `"SENIN-JUMAT, 18-22"`
- `"SABTU 23"`
- `"25-30"`

**Sistem saat ini:** Hanya enum `["SENIN","SELASA",...,"SABTU"]`.

- [ ] **Task 3a: Model — dukung label grup kustom**
  - `GrupHari.label` = string bebas (contoh: "SENIN-JUMAT", "SABTU", "RABU-KAMIS")
  - `GrupHari.hariAktif` = array enum hari (untuk kalkulasi/validasi overlapping)
  - Tampilkan label di UI persis seperti di Excel

- [ ] **Task 3b: Backend — validasi overlapping antar grup**
  - Cek `hariAktif` antar grup dalam periode yang sama tidak boleh overlap
  - Kecuali jika secara eksplisit diizinkan (untuk data yang sama)

---

## B. Critical Gap — Laporan/Export

Excel memiliki **4 sheet laporan** yang tidak bisa dihasilkan oleh sistem saat ini:

### B.1 — LAPORAN HARIAN (669 baris, 21 kolom)

**Struktur per periode:**
```
+--- Section A: Peserta Didik (split 2-3 grup hari horizontal) ---+
| Grup 1 (label)     | Grup 2 (label)     | (Grup 3)            |
| Kelompok | Sekolah | L | P | Total | ...| ...                  |
+---------+---------+---+---+-------+----+----------------------+
| PAUD/TK  | SDN...  |12 |11 |  23   |    | (sama/different)    |
| SD 1-3   | SDN...  |16 |11 |  27   |    |                     |
| ATS <9   | -       | - | - |   0   |    |                     |
| Pendidik | -       | - | - |   0   |    |                     |
| Tendik   | SDN...  | 2 | 8 |  10   |    |                     |
| TOTAL    |         |460|460| 920   |    |                     |
+---------+---------+---+---+-------+----+----------------------+

+--- Section B: Non Peserta B3 (1 grup = SENIN-SABTU) ------------+
| Kelompok | Posyandu   | L | P | Total |
| Bumil    | CEMPAKA 1  |   | 4 |   4   |
| Busui    | CEMPAKA 1  |   |20 |  20   |
| Balita   | CEMPAKA 1  |35 |38 |  73   |
| KADER    | CEMPAKA 1  |   | 7 |   7   |
| TOTAL    |            |282|529| 811   |
```

**Catatan penting:**
- Non-Peserta B3 hanya 1 grup (SENIN-SABTU) — tidak split per hari
- KADER POSYANDU kadang hanya isi kolom Perempuan (L = 0/kosong)
- Setiap grup hari punya baris **TOTAL** sendiri

- [ ] **Task 4a: Backend — endpoint `GET /aslap/laporan/harian?periodeId=X`**
  - Group data per `GrupHari` (setelah Task 1a selesai)
  - Section A: filter detail dengan `jenisSasaran = PESERTA_DIDIK`, group per sekolah
  - Section B: filter detail dengan `jenisSasaran = NON_PESERTA_DIDIK`, group per posyandu
  - Hitung subtotal per kategori per sekolah/posyandu
  - Hitung baris TOTAL per grup hari (L, P, Grand Total)
  - Format: `{ periode, grupHari: [{ label, hariAktif, sesiA: [...], sesiB: [...], totalA, totalB }] }`

- [ ] **Task 4b: Frontend — halaman preview "Laporan Harian"**
  - Tampilkan tabel horizontal multi-kolom persis Excel
  - Tab atau toggle per grup hari
  - Tombol "Export to Excel" / print

### B.2 — LAPORAN PER PERIODE (156 baris, 18 kolom, 5 periode)

Struktur per periode: **Tabel Pendidikan** + **Tabel Posyandu** + baris **JUMLAH**.

#### Tabel Pendidikan

| No | Nama PM | NPSN | Alamat | KECIL 1-3 | BESAR 4-6 | BESAR SMK | lk/1-3 | p/1-3 | lk/4-6 | p/4-6 | lk/smk | p/smk | lk/PIC | P/PIC | JML PIC | JUMLAH PM |

**Rumus kolom:**

| Kolom | Sumber Data | Kalkulasi |
|-------|-------------|-----------|
| KECIL 1-3 | PAUD_TK + SD_1_3 | L + P (total) |
| BESAR 4-6 | SD_4_6 | L + P (total) |
| BESAR SMK | SMP_1_3 + SMA_SMK_4_6 + ATS_9_18TH | L + P (total) |
| lk/1-3, p/1-3 | PAUD_TK + SD_1_3 | per gender |
| lk/4-6, p/4-6 | SD_4_6 | per gender |
| lk/smk, p/smk | SMP_1_3 + SMA_SMK_4_6 + ATS_9_18TH | per gender |
| lk/PIC, P/PIC | TENAGA_KEPENDIDIKAN | per gender |
| JML PIC | TENAGA_KEPENDIDIKAN | L + P |
| **JUMLAH PM** | Semua kolom kecuali ATS_KURANG_9TH & PENDIDIK | **KECIL + BESAR + SMK + JML PIC** |

**Aturan penting:**
- ATS_KURANG_9TH dan PENDIDIK **tidak masuk** tabel ini (walaupun ada di LAPORAN HARIAN)
- JUMLAH PM per sekolah = KECIL 1-3 + BESAR 4-6 + BESAR SMK + JML PIC
- Baris JUMLAH (total bawah) menjumlahkan kolom KECIL, BESAR, SMK, JML PIC secara horizontal — JUMLAH PM = total seluruh JUMLAH PM per sekolah

#### Tabel Posyandu

| No | Nama Posyandu | BALITA | BUMIL | BUSUI | LK/BALITA | P/BALITA | PIC KADER | JUMLAH |

**⚠️ Rumus JUMLAH berbeda antara per-baris dan baris TOTAL:**

**Per baris:** `JUMLAH = BALITA + BUMIL + BUSUI + LK/BALITA + P/BALITA + PIC KADER`
→ Double-count gender balita: `73 + 4 + 20 + 35 + 38 + 7 = 177` (CEMPAKA 1 P7)

**Baris TOTAL:** `JUMLAH = BALITA(total) + BUMIL + BUSUI + PIC KADER` — tanpa sub-kolom gender!
→ `540 + 43 + 170 + 58 = 811` (P7)
→ `540+43+170+**282+258**+58 = 1351` ❌ (kalau pakai rumus per baris)

Ini **inkonsistensi formula Excel sendiri** — sistem perlu implementasi kedua rumus sesuai konteks.

#### Data Inkonsistensi Internal Excel

| Periode | Sekolah | Kolom | Nilai Harian | Nilai Per Periode | Selisih |
|---------|---------|-------|-------------|-------------------|---------|
| 7 | SDN Sukarasa II | KECIL 1-3 | 47 | **46** | -1 |
| 7 | SDN Sukarasa II | lk/1-3 + p/1-3 | 25+22=47 ✅ | 25+22=47 ✅ (tapi KECIL=46 ❌) | — |
| 7 | SDN Ujungjaya III | KECIL 1-3 | 69 | **68** | -1 |
| 7 | SDN Ujungjaya III | p/1-3 | 29 | **28** | -1 |
| 8 | SDN Sukarasa II | KECIL 1-3 | 47 (grp1) + 0 (grp2) | **46** | -1 |
| 9 | SMK Pelita Al-Ikhsan | BESAR SMK | 220 | 220 ✅ | — |
| 9 | SMK Pelita Al-Ikhsan | lk/smk + p/smk | 114+106=220 | **67+91=158** | **-62!** |
| 10 | CEMPAKA 1 | JUMLAH | 177 (Harian) | **104** | -73 |
| 11 | CEMPAKA 2 | JUMLAH | 100 | **60** | -40 |

**Kesimpulan:** Ada data entry error di Excel — beberapa angka tidak konsisten antar sheet dalam file yang sama.

- [ ] **Task 5a: Backend — endpoint `GET /aslap/laporan/periode?periodeId=X`**
  - Agregasi data per sekolah & per posyandu untuk satu periode — agregate seluruh grup hari dalam periode
  - Implementasi helper mapping kategori ke kolom Excel:
    - `KECIL 1-3` = PAUD_TK + SD_1_3 (L+P)
    - `BESAR 4-6` = SD_4_6 (L+P)
    - `BESAR SMK` = SMP_1_3 + SMA_SMK_4_6 + ATS_9_18TH (L+P)
    - `lk/PIC \| P/PIC` = TENAGA_KEPENDIDIKAN per gender
    - `JML PIC` = TENAGA_KEPENDIDIKAN (L+P)
    - `JUMLAH PM` = KECIL + BESAR + SMK + JML PIC
  - Include NPSN dan Alamat dari model `Sekolah`
  - Posyandu JUMLAH: gunakan rumus per-baris untuk data per posyandu, rumus total untuk baris JUMLAH

- [ ] **Task 5b: Frontend — halaman preview + export "Laporan Per Periode"**
  - Dua tabel terpisah (Pendidikan + Posyandu)
  - Baris JUMLAH di bawah masing-masing tabel
  - Kolom NPSN dan Alamat ditampilkan

### B.3 — LAPORAN PER BULAN (38 baris, 16 kolom)

**Format sheet saat ini:**

| No | Hari | Tanggal | Periode | PAUD/TK | SD 1-3 | SD 4-6 | SMP | SMA | Pendidik | Tendik | Bumil | Busui | Balita | Total |

**Kondisi:** Hanya **1 baris data** (6/1/2026, Periode 11, PAUD/TK=23). Selebihnya kosong.

#### Gap B.3.1 — 3 Kategori Hilang dari Sheet

Sheet tidak punya kolom untuk kategori yang ada di sistem & LAPORAN HARIAN:

| Kategori | Status |
|----------|--------|
| ATS_KURANG_9TH | ❌ Tidak ada |
| ATS_9_18TH | ❌ Tidak ada |
| KADER_POSYANDU | ❌ Tidak ada |

→ **Usulan format baru (19 kolom):**

| No | Hari | Tanggal | Periode | PAUD/TK | SD 1-3 | SD 4-6 | SMP | SMA | ATS<9 | ATS9-18 | Pendidik | Tendik | Bumil | Busui | Balita | Kader | Total |

#### Gap B.3.2 — Laporan Agregasi, Bukan Detail

Berbeda dengan LAPORAN HARIAN (per sekolah) dan LAPORAN PER PERIODE (per sekolah):
- Sheet ini adalah **ringkasan harian** — 1 baris = 1 tanggal = total semua sekolah + posyandu
- Tidak ada breakdown per sekolah/posyandu
- Sistem harus bisa agregasi seluruh `InputPenerimaManfaatDetail` per tanggal

#### Gap B.3.3 — Tidak Ada Baris Total

Sheet tidak punya SUBTOTAL per minggu atau TOTAL per bulan. Kolom "Total" (akhir baris) juga kosong.

#### Gap B.3.4 — Data Hampir Tidak Ada

Dari 38 baris, hanya 1 terisi. Perlu diisi dari data LAPORAN HARIAN (5 periode, 669 baris data).

- [ ] **Task 6a: Backend — endpoint `GET /aslap/laporan/bulanan?bulan=X&tahun=X`**
  - Agregasi seluruh `InputPenerimaManfaatDetail` per hari dalam rentang bulan
  - Group by tanggal, hitung total L+P per kategori
  - Format: array per-hari: `{ tanggal, hari, periodeId, paudTk, sd1_3, sd4_6, smp, sma, ats9, ats9_18, pendidik, tendik, bumil, busui, balita, kader, total }`
  - kolom `Total` = jumlah seluruh kategori pada hari itu

- [ ] **Task 6b: Frontend — halaman preview + export "Laporan Bulanan"**
  - Tabel per tanggal dalam satu bulan
  - Baris SUBTOTAL per minggu (opsional)
  - Baris TOTAL per bulan
  - Tombol export ke Excel

- [ ] **Task 6c: Perbaiki struktur sheet Excel LAPORAN PER BULAN**
  - Tambah kolom: **ATS_KURANG_9TH**, **ATS_9_18TH**, **KADER_POSYANDU**
  - Urutan kolom sesuai usulan 19 kolom di atas

### B.4 — JUMLAH PERKELAS (21 baris, 15 kolom)

**Format:** 4-segment horizontal, tiap segment = `NO | KELAS | JUMLAH`, 2 blok vertikal untuk 8 sekolah.

#### Data Completeness Excel

| Sekolah | Kelas & Jumlah | Total | P7 Total | Match? |
|---------|---------------|-------|----------|--------|
| TK AMANAH | TK A-B=23, PIC=2 | **25** | 25 | ✅ |
| SDN WANAJAYA | 1=8, 2=11, 3=8, 4=8, 5=16, 6=11, PIC=10 | **72** | 72 | ✅ |
| **SDN SUKARASA II** | **Semua kosong** | **0** | 108 | ❌ |
| **SDN CIMANUK** | **Semua kosong** | **0** | 153 | ❌ |
| SDN MARGAMULYA | 1=18, 2=19, 3=16, 4=14, 5=26, 6=18, PIC=10 | **121** | 121 | ✅ |
| SDN UJUNGJAYA III | 1=21, 2=29, 3=18, 4=25, 5=24, 6=27, PIC=10 | **154** | 155 | ⚠️ -1 |
| SDN PALASARI | 1=16, 2=17, 3=13, 4=16, 5=13, 6=12, PIC=10 | **97** | 97 | ✅ |
| **SMK PELITA** | **Semua kosong** | **0** | 189 | ❌ |

**4 dari 8 sekolah tidak punya data per-kelas** (Sukarasa II, Cimanuk, SMK Pelita = 0; Ujungjaya selisih 1).

#### Gap B.4.1 — Tidak Ada Indikasi Periode di Sheet

Sheet tidak mencantumkan periode. Data kemungkinan besar untuk **Periode 7** (berdasarkan kecocokan total dengan LAPORAN PER PERIODE P7 untuk 4 sekolah yang match).

#### Gap B.4.2 — Nama Kelas Tidak Seragam

| Jenjang | Excel | Sistem (usulan) |
|---------|-------|-----------------|
| TK | `"TK A-B"`, `"PIC"` | Free text — standarisasi manual |
| SD | `"1"`, `"2"`, ..., `"6"`, `"PIC"` | Sama |
| SMP | (tidak ada data) | `"7"`, `"8"`, `"9"`, `"PIC"` |
| SMA/SMK | (kosong) | `"X"`, `"XI"`, `"XII"`, `"PIC"` atau `"10"`, `"11"`, `"12"` |

#### Gap B.4.3 — Model Sistem Cocok Tapi Tidak Ada UI

`SekolahKelasDetail` sudah perfect match: ✅
| Model | Excel |
|-------|-------|
| `sekolahId` | Nama Sekolah (header) |
| `namaKelas` | KELAS (1, 2, ..., PIC) |
| `jumlah` | JUMLAH |
| `periodeId` | (perlu ditentukan) |

Tapi:
- ❌ Tidak ada UI frontend untuk input
- ❌ Tidak ada endpoint laporan `GET /aslap/laporan/per-kelas`

- [ ] **Task 7a: Backend — endpoint `GET /aslap/laporan/per-kelas?periodeId=X`**
  - Ambil data dari `SekolahKelasDetail` join `Sekolah`
  - Group per sekolah, urut by `namaKelas`
  - Hitung baris **JUMLAH** (total per sekolah)
  - Format: `{ sekolah: { id, nama }, kelas: [{ nama, jumlah }], total }`

- [ ] **Task 7b: Frontend — halaman "Rekap Per Kelas"**
  - Tabel per sekolah: kolom NO | KELAS | JUMLAH
  - Baris JUMLAH di akhir tiap sekolah
  - Export ke Excel format persis JUMLAH PERKELAS

---

## C. Gap Fungsional — Input Data (Prioritas Tinggi)

### C.1 — UI Input Data Per Kelas (SekolahKelasDetail)

**Sistem saat ini:** Model ✅, CRUD API ✅, Frontend ❌

- [ ] **Task 8a: Frontend — halaman "Data Per Kelas"**
  - Pilih periode + sekolah
  - Tabel dinamis: tambah/edit/hapus baris kelas (nama kelas, jumlah)
  - Otomatis hitung total per sekolah
  - Bandingkan total kelas dengan total penerima manfaat per sekolah di periode tsb (validasi silang)
  - Simpan via `POST/PUT/DELETE /aslap/sekolah-kelas-detail`

- [ ] **Task 8b: Validasi backend**
  - `POST /aslap/penerima-manfaat`: cek jika total detail per sekolah > total `SekolahKelasDetail` untuk sekolah tsb
  - Beri warning (bukan block) agar ASLAP sadar ada mismatch

### C.2 — NPSN & Alamat untuk Sekolah
Excel LAPORAN PER PERIODE menampilkan **NPSN** dan **Alamat** setiap sekolah.
Model `Sekolah` punya field `npsn?` dan `alamat?` tapi **tidak diisi**.

- [ ] **Task 9a: Backend — pastikan NPSN & alamat dikembalikan di `GET /aslap/sekolah`**
- [ ] **Task 9b: Frontend — tambah field NPSN & Alamat di form tambah/edit sekolah**
  - Form "Tambah Sekolah Baru" saat ini hanya punya nama dan jenjang
  - Tambah NPSN (text) dan Alamat (textarea)

### C.3 — Kader Posyandu: Kolom Perempuan Saja (Kadang)

Excel Periode 7: KADER POSYANDU hanya isi Perempuan (L=blank). Periode 11: isi L + P.

- [ ] **Task 10: Frontend — opsional: sembunyikan L jika tidak relevan**
  - Khusus KADER_POSYANDU: jika user isi 0 di L, sembunyikan kolom L di laporan
  - Tampilkan hanya kolom Perempuan (seperti Excel style)
  - Tapi tetap simpan L=0 di database untuk konsistensi

### C.4 — Label "PIC" vs "Tenaga Kependidikan"
Excel menggunakan label **"PIC"** (Person In Charge). Sistem menggunakan **TENAGA_KEPENDIDIKAN**.

- [ ] **Task 11: Frontend — alias/nama alternatif "PIC" di tampilan laporan**
  - Tampilkan "Tenaga Kependidikan (PIC)" atau "PIC" di header tabel untuk konsistensi Excel

---

## D. Gap Sedang — Validasi & Konsistensi

### D.1 — Total Penerima vs Total Per Kelas
Excel JUMLAH PERKELAS total per sekolah harus sama dengan total Penerima Manfaat untuk sekolah tsb.

- [ ] **Task 12: Validasi backend**
  - `POST /aslap/penerima-manfaat`: cek jika total detail per sekolah > total `SekolahKelasDetail` untuk sekolah tsb
  - Beri warning (bukan block) agar ASLAP sadar ada mismatch

### D.2 — Total per Periode di Excel vs Database
Beberapa periode di Excel menunjukkan inkonsistensi angka antar sheet:
- Periode 7: LAPORAN HARIAN total=920, LAPORAN PER PERIODE total=920 ✅
- Periode 8: Harian=918+555, Per Periode Pendidikan=979 ❌ (beda)
- Periode 9, 10, 11: angka berubah lagi antar sheet

- [ ] **Task 13: Manual migration data dari Excel ke database**
  - Masukkan seluruh data dari Excel ke sistem via seed atau API
  - Verifikasi total konsisten antara sistem dan Excel

### D.3 — Kategori "Kecil" vs "Besar" Mapping
Excel LAPORAN PER PERIODE mengelompokkan kategori ke kolom **KECIL 1-3** / **BESAR 4-6** / **BESAR SMK**.

- [ ] **Task 14: Backend — helper mapping kategori ke kolom Excel (untuk Task 5a)**
  - Mapping:
    - `kecil1_3`: [PAUD_TK, SD_1_3]
    - `besar4_6`: [SD_4_6]
    - `besarSMK`: [SMP_1_3, SMA_SMK_4_6, ATS_9_18TH]
    - `ats`: [ATS_KURANG_9TH, ATS_9_18TH]
    - `pic`: [TENAGA_KEPENDIDIKAN]
    - `pendidik`: [PENDIDIK]
  - **Catatan:** ATS_KURANG_9TH dan PENDIDIK **tidak muncul** di LAPORAN PER PERIODE — helper harus bisa exclude/include sesuai konteks laporan
  - Bisa hardcode di helper atau tambah field `kelompokLaporan` di model `KategoriPenerima`

### D.4 — Non-Peserta Tidak Split Per Hari

**Temuan Excel:** Semua periode: Non-Peserta B3 hanya 1 grup (SENIN-SABTU).
Berarti data posyandu SAMA untuk semua hari dalam periode.

- [ ] **Task 15: Sistem harus respect aturan ini**
  - Saat bikin grup hari untuk Non-Peserta: otomatis set `hariAktif = ["SENIN","SELASA","RABU","KAMIS","JUMAT","SABTU"]`
  - Atau tawarkan opsi "seragam untuk semua hari"
  - Di laporan, Non-Peserta muncul hanya sekali (tidak split per grup hari)

### D.5 — Tabel Posyandu: Dual Formula JUMLAH

**Temuan Excel:** Rumus JUMLAH berbeda antara per-baris dan baris TOTAL:

**Per baris:** `JUMLAH = BALITA + BUMIL + BUSUI + LK/BALITA + P/BALITA + PIC KADER` (double-count gender)
**Baris TOTAL:** `JUMLAH = BALITA(total) + BUMIL + BUSUI + PIC KADER` (tanpa gender sub)

- [ ] **Task 16: Implementasi dual formula JUMLAH posyandu**
  - Endpoint laporan: per-baris pakai rumus pertama, baris TOTAL pakai rumus kedua
  - Ini mengikuti persis Excel — bukan bug, tapi template yang sudah ada

### D.7 — System Audit: `aslap/penerima-manfaat`

**Sistem saat ini:** Model unified ✅, 13 kategori ✅, per-school storage ✅, ATS handling ✅, L/P split ✅.

#### Temuan Audit

| Area | Status | Detail |
|------|--------|--------|
| Model architecture | ✅ | `InputPenerimaManfaat`+`InputPenerimaManfaatDetail` unified untuk Pendidikan & Posyandu |
| Category mapping (13) | ✅ | Semua kode seed cocok dengan Excel 1:1 |
| Per-jenjang assignment | ✅ | TK: PAUD_TK+PENDIDIK+TENDIK, SD: SD_1_3+SD_4_6+PENDIDIK+TENDIK, dst |
| ATS validation | ✅ | Backend tolak sekolahId/posyanduId untuk ATS_KURANG_9TH / ATS_9_18TH |
| ATS auto-fill 0 | ✅ | Backend auto-tambah ATS dgn L=0, P=0 jika tidak dikirim |
| L/P split | ✅ | Disimpan sebagai field terpisah di model |
| HariAktif shared | ✅ | Cocok dengan Excel (Non-Peserta B3 tidak split per hari) |
| Day overlap validation | ✅ | `SELECT FOR UPDATE` + intersection check di backend |
| Sekolah auto-create | ✅ | Bisa buat sekolah baru via `sekolahNama` (dengan inferJenjang helper) |
| Posyandu auto-create | ✅ | Sama seperti sekolah |

#### Gap D.7.1 — Tidak Ada Endpoint Laporan (CRITICAL)

0 hasil grep untuk `laporan` di `aslap.js`. Sistem hanya menyimpan input — tidak bisa generate:
- ❌ LAPORAN HARIAN (per grup hari, per sekolah + posyandu, dengan baris TOTAL)
- ❌ LAPORAN PER PERIODE (tabel Pendidikan 15 kolom + tabel Posyandu 7 kolom)
- ❌ LAPORAN PER BULAN (agregasi per tanggal sebulan)
- ❌ JUMLAH PERKELAS (breakdown per kelas per sekolah)

→ Semua sudah tercakup di **Task 4-7** di atas, tapi perlu diperkuat.

- [ ] **Task 18a: Perkuat Task 4-7 dengan catatan audit**
  - Semua endpoint laporan harus pakai **data dari `InputPenerimaManfaatDetail`** (bukan tabel rekap terpisah)
  - Format response: return data siap-tampil (tidak perlu kalkulasi ulang di frontend)
  - Termasuk baris TOTAL per sekolah, per grup hari, dan grand total

#### Gap D.7.2 — Tidak Ada Computed Field PIC / Grand Total di Table

Table view hanya menampilkan detail items flat — tidak ada:
- Kolom **PIC** (PENDIDIK + TENAGA_KEPENDIDIKAN per sekolah)
- Baris **TOTAL** per input (grand total L + P)
- Baris **TOTAL** per kategori (horizontal sum across schools)

- [ ] **Task 18b: Frontend — tambah ringkasan di table**
  - Footer baris: TOTAL L, TOTAL P, GRAND TOTAL per row input
  - Computed column: PIC = PENDIDIK + TENAGA_KEPENDIDIKAN
  - Atau buat kartu ringkasan di atas tabel

#### Gap D.7.3 — Tidak Ada Validasi Silang dengan SekolahKelasDetail

Sistem menyimpan `SekolahKelasDetail` dan `InputPenerimaManfaatDetail` secara terpisah tanpa hubungan:
- Tidak validasi: `SUM(detail per sekolah) > SekolahKelasDetail.total` ❌
- Tidak validasi: `PENDIDIK + TENAGA_KEPENDIDIKAN > SekolahKelasDetail.pic` ❌
- Tidak warning ketika total input melebihi kapasitas kelas

→ Sebagian sudah tercakup di **Task 12 / D.1**, tapi perlu diperjelas scope.

- [ ] **Task 18c: Validasi silang backend**
  - `POST /aslap/penerima-manfaat`: setelah simpan, hitung total per sekolah
  - Bandingkan dengan `SekolahKelasDetail` untuk sekolah+periode yg sama
  - Jika melebihi atau kurang > 10%, return **warning** (bukan block error)
  - Simpan warning di response agar frontend bisa tampilkan

#### Gap D.7.4 — No API to Generate Aggregated Report Data

Tidak ada endpoint satupun yang bisa aggregasi data input ke format laporan:
- Tidak ada `GET /aslap/laporan/...` — harus dibuat dari nol
- Frontend tidak bisa preview laporan apapun
- Satu-satunya cara lihat data: table `InputPenerimaManfaat` (per-input, bukan per-sekolah/per-tanggal)

- [ ] **Task 18d: Backend — endpoint `GET /aslap/laporan/aggregate?periodeId=X`**
  - Aggregate semua detail dalam periode: group by sekolah + kategori
  - Return: `{ sekolahId, sekolahNama, kategoriKode, totalL, totalP, total }`
  - Bisa dipakai sebagai data mentah untuk LAPORAN HARIAN & PER PERIODE
  - Pisahkan Section A (PESERTA_DIDIK) dan Section B (NON_PESERTA_DIDIK)

### D.6 — Data Cleaning & Verifikasi Inkonsistensi Excel

**Temuan Excel:** Ditemukan data inkonsistensi antar sheet dalam file yang sama:

| Periode | Sumber | Detail | Selisih |
|---------|--------|--------|---------|
| 7 | SDN Sukarasa II | KECIL 1-3 = 46, tapi gender sum = 47, Harian = 47 | -1 |
| 7 | SDN Ujungjaya III | KECIL = 68 (Periode) vs 69 (Harian), p/1-3 = 28 vs 29 | -1 |
| 8 | SDN Sukarasa II | KECIL = 46, Harian grp1=47 + grp2=0, gender sum=47 | -1 |
| 9 | SMK Pelita Al-Ikhsan | BESAR SMK = 220, gender sum = 67+91 = 158 | **-62** |
| 10 | CEMPAKA 1 | JUMLAH = 104 vs Harian = 177 | -73 |
| 11 | CEMPAKA 2 | JUMLAH = 60 vs Harian = 100 | -40 |

- [ ] **Task 17: Verifikasi data dengan user**
  - Tanyakan ke ASLAP: mana angka yang benar untuk tiap inkonsistensi?
  - Catat hasilnya sebagai referensi migrasi data (Task 13)
  - Update Excel jika perlu sebelum migrasi

---

## E. Informasi Tambahan

### E.1 — Struktur Excel Referensi
File: `D:\LAPORAN ASLAP BARU.xlsx`

| Sheet | Baris | Kolom | Data Periode |
|-------|-------|-------|-------------|
| LAPORAN HARIAN | 669 | 21 | Periode 7, 8, 9, 10, 11 |
| LAPORAN PER PERIODE | 156 | 18 | Periode 7, 8, 9, 10, 11 |
| LAPORAN PER BULAN | 38 | 15 | Juli 2026 (1 baris data) |
| JUMLAH PERKELAS | 21 | 15 | Per sekolah (8 sekolah) |

### E.2 — Pola Split Grup Hari per Periode

| Periode | Grup 1 | Grup 2 | Grup 3 |
|---------|--------|--------|--------|
| 7 | SENIN-JUMAT | SABTU | - |
| 8 | SENIN, SELASA, JUMAT | RABU-KAMIS | SABTU |
| 9 | SELASA-JUMAT | SENIN & SELASA | SABTU |
| 10 | SENIN-JUMAT | SABTU | (18-22) & (SABTU 23) |
| 11 | SENIN-JUMAT 25-30 | SABTU | - |

### E.3 — 13 Kategori Penerima (seed)

| Kode | Nama | Sasaran | Porsi | Kolom Laporan |
|------|------|---------|-------|---------------|
| PAUD_TK | PAUD/TK/RA/TKLB | PESERTA_DIDIK | KECIL | KECIL 1-3 |
| SD_1_3 | SD/MI/SDLB Kelas 1-3 | PESERTA_DIDIK | KECIL | KECIL 1-3 |
| SD_4_6 | SD/MI/SDLB Kelas 4-6 | PESERTA_DIDIK | BESAR | BESAR 4-6 |
| SMP_1_3 | SMP/MTs/SMPLB/Pesantren | PESERTA_DIDIK | BESAR | BESAR SMK |
| SMA_SMK_4_6 | SMA/MA/SMK/SMALB/Pesantren | PESERTA_DIDIK | BESAR | BESAR SMK |
| ATS_KURANG_9TH | Anak Tidak Sekolah <9 th | PESERTA_DIDIK | KECIL | ATS |
| ATS_9_18TH | Anak Tidak Sekolah 9-18 th | PESERTA_DIDIK | BESAR | ATS |
| PENDIDIK | Pendidik | PESERTA_DIDIK | BESAR | Pendidik |
| TENAGA_KEPENDIDIKAN | Tenaga Kependidikan | PESERTA_DIDIK | BESAR | PIC |
| BUMIL | Ibu Hamil | NON_PESERTA_DIDIK | BESAR | Bumil |
| BUSUI | Ibu Menyusui | NON_PESERTA_DIDIK | BESAR | Busui |
| BALITA | Balita (Non PAUD) | NON_PESERTA_DIDIK | KECIL | Balita |
| KADER_POSYANDU | Kader Posyandu | NON_PESERTA_DIDIK | BESAR | Kader |

### E.4 — 8 Sekolah & 9 Posyandu di Excel

**Sekolah:** TK Amanah, SDN Wanajaya, SDN Sukarasa II, SDN Cimanuk, SDN Margamulya, SDN Ujungjaya III, SDN Palasari, SMK Pelita Al-Ikhsan

**Posyandu:** CEMPAKA 1/2/3, TERATAI 1/2/3, MAWAR 1/2/3

### E.5 — System Architecture: `penerima-manfaat`

```
InputPenerimaManfaat (parent)
  ├── periodeId → Periode
  ├── hariAktif → HariMenu[]      ← shared by ALL details
  ├── createdById → User
  └── detail[] → InputPenerimaManfaatDetail
        ├── kategoriId → KategoriPenerima (13 kode)
        ├── sekolahId? → Sekolah          (PESERTA_DIDIK)
        ├── posyanduId? → Posyandu        (NON_PESERTA_DIDIK)
        ├── lakiLaki: Int
        └── perempuan: Int

SekolahKelasDetail (standalone, no FK to InputPenerimaManfaat)
  ├── periodeId → Periode
  ├── sekolahId → Sekolah
  ├── namaKelas: String  ("1".."6", "TK A-B", "PIC")
  └── jumlah: Int
```

**Key points:**
- Model sudah unified ✅ (Pendidikan & Posyandu dalam 1 model detail)
- `hariAktif` di parent — semua detail dalam 1 input punya hari yg sama
- `SekolahKelasDetail` terpisah dari `InputPenerimaManfaatDetail` — tidak ada FK relasi
- Tidak ada tabel agregasi/laporan — semua laporan harus di-generate via query aggregasi

---

## Ringkasan Prioritas

| Prioritas | Task | Estimasi |
|-----------|------|----------|
| 🔴 Critical | Task 1: Multi grup hari (model + UI) | 3-4 hari |
| 🔴 Critical | Task 2: Pisahkan Pendidik dari blok sekolah | 1 hari |
| 🔴 Critical | Task 4-7: Endpoint laporan (Harian, Per Periode, Bulanan, Per Kelas) | 6-7 hari |
| 🔴 Critical | Task 8: UI Input Data Per Kelas | 2 hari |
| 🔴 Critical | **Task 18a: Perkuat endpoint laporan dengan data InputPenerimaManfaatDetail** | — |
| 🟡 High | Task 3: Label hari kustom | 0.5 hari |
| 🟡 High | Task 9: NPSN & Alamat sekolah | 0.5 hari |
| 🟡 High | Task 14: Helper mapping KECIL/BESAR/SMK | 1 hari |
| 🟡 High | Task 15: Non-Peserta tidak split by day | 0.5 hari |
| 🟡 High | Task 16: Dual formula JUMLAH posyandu | 0.5 hari |
| 🟡 High | **Task 18b: Frontend — ringkasan PIC + total di table** | 1 hari |
| 🟡 High | **Task 18c: Validasi silang backend dgn SekolahKelasDetail** | 1 hari |
| 🟡 High | **Task 18d: Endpoint aggregasi data laporan** | 1 hari |
| 🟢 Medium | Task 10-12: Validasi, label, kader | 1.5 hari |
| 🟢 Medium | Task 13: Migrasi data Excel ke DB | 2 hari |
| 🟢 Medium | Task 17: Verifikasi inkonsistensi Excel | 0.5 hari |
