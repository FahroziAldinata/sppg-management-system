# 05 — Status Modul

Legenda: ✅ selesai · 🟡 sebagian/ada gap · ⬜ belum mulai

| Modul | Schema | Seed | API | Query laporan | Frontend | Catatan |
|---|---|---|---|---|---|---|
| User & Auth | ✅ | ✅ | ✅ | — | ✅ | JWT stateless, `requireAuth`/`requireRole` di `src/middleware/auth.js` |
| Periode & SetupLembaga | ✅ | ✅ (1 contoh) | — | — | ⬜ | Dikelola dari seed / database |
| Taksonomi (KategoriPenerima, KelompokUmurMenu, BatasHargaPorsi) | ✅ | ✅ | 🟡 | — | ⬜ | Mapping many-to-many sudah diseed sesuai v5.3. API GET kelompok-umur-menu selesai. |
| Aslap — Input Penerima Manfaat | ✅ | ✅ (Sekolah & Posyandu) | ✅ | ⬜ | ✅ | `hariAktif` array (v5), validasi non-overlap dengan row lock (`SELECT FOR UPDATE`), dan findOrCreate sekolah/posyandu selesai |
| Aslap — Jumlah Per Kelas | ✅ (pembantu) | ⬜ | ✅ | — | ⬜ | `SekolahKelasDetail` CRUD selesai, tidak dipakai laporan resmi |
| Mitra — Harga Bahan | ✅ | ⬜ | ✅ | — | ✅ | CRUD HargaBahanPeriode & read-only BahanPokok selesai |
| Stok (Saldo/Masuk/Keluar) | ✅ | ✅ (Bahan) | ✅ | ✅ | ⬜ | POST SaldoAwalBarang, MutasiStok MASUK/KELUAR selesai, dan Laporan Stock Barang teruji |
| Menu (Master, Harian, Blok, Item, Bahan, Target Gizi, Organoleptik) | ✅ | ⬜ | ✅ | ✅ | 🟡 | CRUD MenuHarianBlok, MenuItem, MenuItemBahan, TargetGizi (create-only), & Organoleptik (dilengkapi retensi sampel chiller 3 hari) selesai di frontend. Data detail persist via include pada query GET /menu-harian backend. |
| Alergi | ✅ (v5) | — | ✅ | ✅ | ✅ | AlergiCatatan CRUD selesai (frontend & backend). |
| Pengiriman (Kendaraan) | ✅ (v5) | ✅ | ✅ | — | ⬜ | CRUD Kendaraan & PengirimanHarian selesai. |
| RAB Harian & Pembelian | ✅ | ⬜ | ✅ | — | ⬜ | CRUD RabHarian selesai dengan manual cascade delete dan JurnalTransaksi conflict check. |
| Anggaran Resmi (AnggaranHarian) | ✅ | ⬜ | ✅ | — | ⬜ | CRUD AnggaranHarian selesai dengan BatasHargaPorsi validation dan non-zero aktual check. |
| Ledger (Akun, Jurnal, SaldoAwal) | ✅ | ✅ (Akun) | ✅ | ✅ | ⬜ | JurnalTransaksi POST/GET/PUT/DELETE selesai, validasi aktif akun diterapkan |
| Dokumen Resmi (LPA/SPTJ/BAPSD) | ✅ | ⬜ | ✅ | ✅ | ⬜ | Live generator, list, publish, delete selesai |
| Daftar Nominatif Upah | ✅ | ⬜ | ✅ | — | ⬜ | CRUD DaftarNominatifUpah + detailHarian selesai |
| Approval | ✅ | — | ✅ | — | ⬜ | Level: per hari (MenuHarian) & RabHarian. Akses eksklusif KEPALA_SPPG, mandatory periodeId, limit/offset pagination, status transition matrix & concurrency lock teruji. |
| Validasi Stok | ✅ | — | ✅ | ✅ | ⬜ | Pelaksana: Akuntan. Endpoint POST (reconciliation), GET (list), dan GET preview kalkulator (agregasi MutasiStok masuk vs keluar) teruji. |
| Audit Log & Notifikasi | ✅ | — | ✅ | — | ⬜ | Notifikasi selesai (terintegrasi dengan trigger POST approval). Audit Log ditunda atas keputusan bisnis (YAGNI). |

## Ringkasan

Semua **schema** modul inti dan seluruh **API Backend + Query Laporan** telah diselesaikan sepenuhnya (100% closed & teruji). BKU, BP, LPA, SPTJ, BAPSD, KebutuhanBelanjaBahan, LaporanPerPeriode, LaporanPerBulan, dan StockBarang berhasil diimplementasikan dan lolos pengujian integrasi. Langkah selanjutnya adalah memulai pengembangan Frontend (Vite/React).
