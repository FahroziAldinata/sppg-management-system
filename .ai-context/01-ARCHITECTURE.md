# 01 — Architecture

Referensi schema: `prisma/schema.prisma` v5.2 (38+ model). Dokumen ini ringkasan struktur & alasan, bukan pengganti baca schema langsung.

## Prinsip desain

- **General ledger double-entry** untuk semua pencatatan uang. `Akun` (chart of accounts) + `JurnalTransaksi` (tiap baris = 1 debet-kredit pair ke 2 akun) + `SaldoAwalPeriode` (carry-forward). Semua laporan turunan (BKU, BP per jenis dana, LR, LPA, SPTJ, BAPSD) di-generate via query dari jurnal — bukan tabel terpisah per laporan.
- **Nested workflow**: `Periode` (2 minggu) berisi siklus **harian** — `MenuHarian` + `RabHarian` adalah "amplop approval" per hari, direview `Kepala SPPG` lewat `Approval`.
- **RAB Harian ≠ RAB Periode sebagai tabel.** RAB Periode = agregasi SUM query dari `AnggaranHarian` harian, tidak disimpan sebagai baris sendiri.
- **1 taksonomi kategori penerima**, bukan banyak. `KategoriPenerima` (13 kategori resmi BGN: 9 Peserta Didik + 4 Non-Peserta Didik/B3) dipakai bersama oleh Aslap (input jumlah), Ahli Gizi (lewat mapping `KelompokUmurMenu`), dan Akuntan (`HargaPaketKategoriPeriode`, `AnggaranBahanMakananDetail`).
- **Nilai gizi 100% manual.** `MenuItemBahan` (kalori/protein/lemak/karbo/serat) diisi ahli gizi dari rujukan TKPI eksternal — sistem tidak pernah menghitung/mengarang rumus konversi gizi.

## Peta modul

| Modul | Model inti | Dipakai role |
|---|---|---|
| User & Auth | `User` | semua |
| Periode | `Periode`, `SetupLembaga` | semua |
| Taksonomi | `KategoriPenerima`, `KelompokUmurMenu`, `BatasHargaPorsi` | Aslap, Ahli Gizi, Akuntan, Kepala SPPG |
| Penerima manfaat | `Sekolah`, `Posyandu`, `InputPenerimaManfaat`, `InputPenerimaManfaatDetail`, `SekolahKelasDetail` (pembantu) | Aslap |
| Harga | `HargaPaketKategoriPeriode`, `BahanPokok`, `HargaBahanPeriode` | Akuntan, Mitra |
| Stok | `SaldoAwalBarang`, `MutasiStok` | Mitra/Akuntan (pencatat) |
| Menu | `MasterMenuMingguan`, `MenuHarian`, `MenuHarianBlok`, `MenuItem`, `MenuItemBahan`, `MenuTargetGizi`, `MenuOrganoleptik`, `AlergiCatatan` | Ahli Gizi |
| Pengiriman | `Kendaraan`, `PengirimanHarian` | Ahli Gizi/Aslap (operasional dapur) |
| RAB & Pembelian | `RabHarian`, `Supplier`, `TransaksiPembelian`, `TransaksiPembelianItem` | Akuntan |
| Anggaran resmi | `AnggaranHarian`, `AnggaranBahanMakananDetail` | Akuntan |
| Ledger | `Akun`, `SaldoAwalPeriode`, `JurnalTransaksi` | Akuntan |
| Dokumen & Upah | `DokumenResmi`, `DaftarNominatifUpah`, `DaftarNominatifUpahHarian` | Akuntan |
| Approval | `Approval` (target `MenuHarian` atau `RabHarian`) | Kepala SPPG |
| Validasi stok | `ValidasiStok` | Akuntan (asumsi) |
| Audit & Notif | `AuditLog`, `Notifikasi` | sistem |

## Granularitas kunci (sering salah asumsi, dicatat biar tidak berulang)

- **Input penerima manfaat BUKAN per-tanggal.** `InputPenerimaManfaat.hariAktif` adalah **array `HariMenu[]`** (kombinasi hari bebas, mis. `[SELASA, KAMIS]`) — bukan enum 2 nilai tetap. Validasi non-overlap antar-row per periode ada di app-layer, bukan constraint DB.
- **`SekolahKelasDetail` murni tabel pembantu/audit-trail.** Berisi angka mentah per kelas yang dijumlah Aslap manual jadi bucket `KategoriPenerima` (kelas 1+2+3 = KECIL 1-3). Tidak ada modul lain yang query dari sini.
- **Modul stok terkonfirmasi** (bukan spekulatif lagi): `SaldoAwalBarang` = saldo awal per bahan **per periode**. `MutasiStok` generik (MASUK/KELUAR) + field opsional `supplierId`/`hargaBeli` (khusus MASUK) dan `kelompokPenerima` (khusus KELUAR, SISWA/B3). Harga beli terkini untuk laporan stok = query `MAX(tanggal)` dari `MutasiStok` jenis MASUK, tidak disimpan sebagai tabel/kolom sendiri.
- **"Kebutuhan Belanja Bahan"** (agregasi berat bahan x jumlah penerima, lintas kelompok umur) tidak punya tabel sendiri — dihitung app-layer dari `MenuItemBahan.beratKotorGr` × `InputPenerimaManfaatDetail` via mapping `KelompokUmurMenu → KategoriPenerima`.
- **Daftar Nominatif Upah**: `HONORARIUM SUKARELAWAN` dan `TOTAL UPAH` adalah nilai turunan (SUM harian, + komponen tambahan), bukan kolom tersimpan. `danaKesehatan`/`tk`/`pj` adalah input manual **per relawan per periode** (dikonfirmasi dari screenshot header sheet asli).

## Yang sengaja TIDAK dibuat sebagai tabel (YAGNI, cek `04-TODO.md`/`05-STATUS-MODUL.md` sebelum menambah)

- Rekap "Jumlah Per Kelas" versi resmi → view/query dari `InputPenerimaManfaatDetail`, `SekolahKelasDetail` cuma pembantu.
- "Tabel bantuan" harga beli terbaru (row-labels/pivot Excel) → query, bukan tabel.
- RAB Periode, "Kebutuhan Belanja Bahan" → semua agregasi/query dari data harian.
