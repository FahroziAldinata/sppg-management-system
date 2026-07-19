# Daftar Tugas SPPG — Modul Ahli Gizi (Juli 2026)

Berdasarkan audit modul Ahli Gizi terhadap referensi `MENU 12 17I JANUARI.xlsx`.

---

## A. Critical Gap (Prioritas Tinggi)

### A.1 — Total Gizi per Blok (Sum Gizi Values)

Excel menampilkan baris **"Total Gizi Menu"** per blok yang menjumlahkan seluruh nilai gizi dari semua bahan:
- Total Energi (kkal)
- Total Protein (gr)
- Total Lemak (gr)
- Total Karbohidrat (gr)
- Total Serat (gr)

**Saat ini:** Tidak ada kode yang menjumlah gizi values — hanya `getBlokTotalHarga()` untuk biaya.

- [ ] **Task 1a: Backend — endpoint/tambahan field total gizi per blok**
  - Tambah field computed `totalGizi` di response `GET /gizi/menu-harian`
  - Atau hitung di frontend dari data bahan existing
  - Format: `{ totalEnergi, totalProtein, totalLemak, totalKarbo, totalSerat }`

- [ ] **Task 1b: Frontend — tampilkan Total Gizi di panel bahan**
  - Tambah baris `TOTAL` di tabel bahan setiap menu item atau per blok
  - Format: bold row di bagian bawah tabel dengan sum masing-masing kolom gizi

### A.2 — Target Gizi vs Realisasi + % Pemenuhan

Excel menampilkan per blok:
```
KEBUTUHAN GIZI ...   | Energi | Protein | Lemak | Karbohidrat | Serat
Total Gizi Menu      | 403.1  | 16      | 12    | 53.5        | 1.7
Target               | 350    | 6       | 12    | 55          | 3
Pemenuhan %          | 115%   | 267%    | 100%  | 97%         | 57%
```

- [ ] **Task 2a: Backend — include `targetGizi` di `GET /gizi/menu-harian`**
  - File: `backend/src/routes/gizi.js` baris 77-87
  - Tambah `targetGizi: true` di dalam include blok
  - Saat ini include: `organoleptik`, `alergi`, `menuItem` — targetGizi tidak ada

- [ ] **Task 2b: Frontend — ambil data targetGizi dan tampilkan**
  - Baca `targetGizi` dari response blok (setelah Task 2a)
  - Hitung total gizi actual (dari Task 1a)
  - Tampilkan tabel perbandingan: **Target vs Actual vs % Pemenuhan**
  - Layout per blok, persis format Excel

- [ ] **Task 2c: Frontend — visual alert jika pemenuhan < 80% atau > 120%**
  - Badge merah/kuning/hijau untuk tiap komponen gizi
  - Tooltip atau highlight baris yang di luar toleransi

---

## B. Gap Sedang (Prioritas Menengah)

### B.1 — Budget Control: Validasi Block Submit

Saat ini `BatasHargaPorsi` ditampilkan dengan badge hijau/merah tapi **tidak memblock submit**.

- [ ] **Task 3a: Frontend — block tombol "Ajukan" jika over budget**
  - Cek `isOverBatas` di `handleAjukanMenu()` sebelum PUT status
  - Jika over budget, tampilkan toast error dan jangan lanjut
  - File: `frontend/src/pages/gizi/MenuHarianPage.jsx` baris 647-668

- [ ] **Task 3b: Frontend — tooltip/peringatan jelas di tombol Ajukan**
  - Jika over budget, tombol disabled dengan tooltip: "Total biaya melebihi batas maksimal porsi"

### B.2 — Perhitungan Otomatis (Sudah Jalan, Verifikasi)

✅ `beratKotorGr = beratBersihGr / bddPersen * 100`  
✅ `totalHargaBahan = beratKotorGr * hargaSatuan / beratSatuanGr`  
✅ `hargaSatuan` auto dari `HargaBahanPeriode` (fallback ke periode sebelumnya)

No action needed — hanya perlu verifikasi passing regression test jika ada perubahan.

---

## C. Minor / Enhancement

### C.1 — Organoleptik: tanggal kadaluwarsa sampel

- [ ] **Task 4: Verifikasi logika retensi chiller 3 hari**
  - `tanggalMusnah = ujiPadaTanggal + 3 hari` sudah di backend ✅
  - Frontend tampilkan tanggal musnah? Saat ini tidak tampil di UI

### C.2 — Alergi Catatan: validasi total siswa

- [ ] **Task 5: Opsional — validasi jumlahSiswa alergi tidak melebihi total penerima blok**
  - Saat ini bebas input berapapun
  - Bisa tambah warning jika jumlah alergi > total penerima manfaat

---

### B.3 — Master Menu Mingguan: Rotasi 2 Minggu + Label Khusus

**Sheet MENU PENDIDIKAN** (Excel) memiliki rotasi menu 2 minggu:
- **Minggu 1** (row 8-12): Senin-Sabtu dengan menu A
- **Minggu 2** (row 17-21): Senin-Sabtu dengan menu B (berbeda)
- **SABTU KERINGAN**: Sabtu hanya 3 komponen (Roti Abon, Susu, Buah Apel) — tanpa sayur

Sistem saat ini hanya menyimpan 1 menu per `[periodeId, jalur, hari]`.

- [ ] **Task 6a: Schema — tambah field `mingguKe` di model `MasterMenuMingguan`**
  - Tipe: `Int` (1 atau 2)
  - Unique constraint jadi `[periodeId, jalur, hari, mingguKe]`
  - File: `backend/prisma/schema.prisma` model MasterMenuMingguan

- [ ] **Task 6b: Schema — tambah field `catatan` di model `MasterMenuMingguan`**
  - Untuk label seperti "SABTU KERINGAN"
  - Tipe: `String?` (opsional)

- [ ] **Task 6c: Backend — update CRUD `/api/gizi/master-menu`**
  - Terima & validasi field `mingguKe` (default 1)
  - Terima field `catatan`
  - Update validation enum/filter

- [ ] **Task 6d: Frontend — update form Setup Master Menu**
  - Tambah dropdown "Minggu ke- (1/2)" di form create/edit
  - Tambah input opsional "Catatan" untuk label khusus
  - Tampilkan kolom `mingguKe` + `catatan` di tabel

- [ ] **Task 6e: Frontend — update "Isi dari Master" untuk deteksi minggu**
  - Hitung minggu ke-berapa dari tanggal MenuHarian (minggu ganjil/genap dalam periode)
  - Pilih master menu sesuai `mingguKe`

---

## D. Selesai (Done — Tidak Perlu Tindakan)

| Area | Status | Keterangan |
|------|--------|------------|
| **Kelompok Umur Menu** | ✅ | Sesuai Excel: TK, SD 1-3, SD 4-6, Balita 6-11bln, Balita 1-3th. Plus tambahan. |
| **Approval Flow** | ✅ | DRAFT→DIAJUKAN→DISETUJUI/DITOLAK. Row-locking, notifikasi, test coverage. |
| **Auto Harga Bahan** | ✅ | `hargaSatuan` dari `HargaBahanPeriode` + fallback. |
| **MenuOrganoleptik** | ✅ | CRUD lengkap. Retensi 3 hari. |
| **AlergiCatatan** | ✅ | CRUD lengkap. |
| **PengirimanHarian** | ✅ | Multi-kategori per kendaraan. |
