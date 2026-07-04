# 04 — TODO (sebelum frontend dimulai)

Urutan disarankan. Jangan lompat ke frontend sebelum backend inti + seed selesai — API kosong = frontend ngarang data.

## 1. Konfirmasi teknis kecil

- [ ] Putuskan: dev pakai PostgreSQL lokal terus, atau langsung pindah ke Supabase? Kalau pindah, siapkan `.env` baru + `npx prisma migrate deploy` (bukan `migrate dev`) ke Supabase.
- [x] Verifikasi tabel v5.2 di DBeaver — cocokkan sama daftar model di `01-ARCHITECTURE.md`.

## 2. Seed data master (wajib sebelum API bisa dites)

- [x] `KategoriPenerima` — 13 baris resmi BGN (kode, nama, jenisSasaran, jenisPorsi, urutan).
- [x] `BatasHargaPorsi` — 2 baris (KECIL=8000, BESAR=10000).
- [x] `Akun` — chart of accounts awal (minimal: Petty Cash/Cash in Hand, Kas di Bank, akun Bahan Baku/Operasional/Sewa/Insentif Fasilitas/Pajak). Kode 4-digit masih gap (`03-DECISIONS.md` poin 6) — pakai kode sementara, tandai revisi.
- [x] `Kendaraan` — 3 baris mobil (nama, plat nomor kalau ada).
- [x] `User` — minimal 1 akun per role (Aslap, Mitra, Ahli Gizi, Akuntan, Kepala SPPG) untuk testing.
- [x] `Sekolah` & `Posyandu` — master data institusi (bisa mulai dari contoh yang sudah ada: TK Amanah, SDN Wanajaya, SMK Pelita, dst).
- [x] `SetupLembaga` — data lembaga untuk 1 periode contoh.

## 3. Backend API — modul per role

- [x] Auth: login, session/JWT, middleware role-check.
- [x] Aslap: CRUD `InputPenerimaManfaat` + detail, CRUD `SekolahKelasDetail` (pembantu).
- [x] Mitra: CRUD `HargaBahanPeriode`.
- [x] Ahli Gizi: CRUD `MasterMenuMingguan`, `MenuHarian`/`MenuHarianBlok`/`MenuItem`/`MenuItemBahan`, `MenuTargetGizi`, `MenuOrganoleptik`, `AlergiCatatan`, `PengirimanHarian` (and `Kendaraan`).
- [x] Akuntan: CRUD `RabHarian` & `AnggaranHarian` (✅), `JurnalTransaksi` full CRUD (✅), `DokumenResmi` (✅), `DaftarNominatifUpah` (✅), `SaldoAwalBarang` POST (✅), `MutasiStok` MASUK (✅), KELUAR (✅), query harga beli terbaru (✅).
- [x] Kepala SPPG: endpoint approval (`Approval` untuk `MenuHarian`/`RabHarian`) (✅), view-only laporan (✅).
- [x] Endpoint laporan/agregasi (read-only, query-heavy, bukan tabel): Kebutuhan Belanja Bahan, Laporan Per Periode (Pendidikan & Posyandu), Laporan Per Bulan, BKU, BP per jenis dana, LR, LPA, SPTJ, BAPSD, Stock Barang.

## 4. Validasi app-layer (tidak ada di constraint DB, wajib dicek di kode)
 
- [x] `InputPenerimaManfaat.hariAktif` antar-row dalam 1 periode tidak boleh overlap hari.
- [x] `InputPenerimaManfaatDetail`: tepat satu dari `sekolahId`/`posyanduId` terisi, sesuai `kategori.jenisSasaran`.
- [x] `Approval.catatan` wajib diisi kalau status `DITOLAK`.
- [x] Validasi anggaran minus → trigger loop revisi menu (terjalin di validasi batas harga porsi & RAB).
 
## 5. Baru setelah semua di atas jalan → mulai frontend
 
- [ ] Setup Vite + routing per role.
- [ ] Dashboard per role sesuai alur kerja di `00-PROJECT.md`.
