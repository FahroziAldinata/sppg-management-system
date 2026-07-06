# 05 — Status Modul

Legenda: ✅ selesai · 🟡 sebagian/ada gap · ⬜ belum mulai

| Modul | Schema | Seed | API | Query laporan | Frontend | Catatan |
|---|---|---|---|---|---|---|
| User & Auth | ✅ | ✅ | ✅ | — | ✅ | JWT stateless, `requireAuth`/`requireRole` di `src/middleware/auth.js` |
| Periode & SetupLembaga | ✅ | ✅ (1 contoh) | — | — | ⬜ | Dikelola dari seed / database |
| Taksonomi (KategoriPenerima, KelompokUmurMenu, BatasHargaPorsi) | ✅ | ✅ | 🟡 | — | ⬜ | Mapping many-to-many sudah diseed sesuai v5.3. API GET kelompok-umur-menu selesai. |
| Aslap — Input Penerima Manfaat | ✅ | ✅ (Sekolah & Posyandu) | ✅ | ⬜ | ✅ | `hariAktif` array (v5), validasi non-overlap dengan row lock (`SELECT FOR UPDATE`), dan findOrCreate sekolah/posyandu selesai |
| Aslap — Jumlah Per Kelas | ✅ (pembantu) | ⬜ | ✅ | — | ⬜ | `SekolahKelasDetail` CRUD selesai, tidak dipakai laporan resmi |
| Mitra — Harga Bahan | ✅ | — | ✅ | — | ✅ | CRUD HargaBahanPeriode & read-only BahanPokok selesai |
| Stok (Saldo/Masuk/Keluar) | ✅ | ✅ (Bahan) | ✅ | ✅ | ✅ | Backend & Frontend selesai. Form MutasiStok & SaldoAwalBarang terintegrasi. Perbaikan bug StockBarang lintas-periode (gte periode.tanggalMulai) diaplikasikan. |
| Validasi Stok | ✅ | — | ✅ | ✅ | ✅ | Backend & Frontend selesai (preview, reconciliation, list). |
| Menu (Master, Harian, Blok, Item, Bahan, Target Gizi, Organoleptik) | ✅ | — | ✅ | ✅ | ✅ | CRUD MenuHarianBlok, MenuItem, MenuItemBahan, TargetGizi, Organoleptik, & MasterMenuMingguan selesai di frontend. |
| Alergi | ✅ (v5) | — | ✅ | ✅ | ✅ | AlergiCatatan CRUD selesai (frontend & backend). |
| Pengiriman (Kendaraan) | ✅ (v5) | ✅ | ✅ | — | ✅ | CRUD Kendaraan & PengirimanHarian selesai di backend & frontend. |
| RAB Harian & Pembelian | ✅ | — | ✅ | — | ✅ | CRUD RabHarian selesai. Frontend: form create + tabel list read-only di AkuntanDashboard.jsx. |
| Anggaran Resmi (AnggaranHarian) | ✅ | — | ✅ | — | ✅ | CRUD AnggaranHarian selesai. Frontend: form conditional (BAHAN_MAKANAN rincian vs flat) + tabel list. |
| Ledger (Akun, Jurnal, SaldoAwal) | ✅ | ✅ (Akun) | ✅ | ✅ | ✅ | Frontend: form + dropdown akun aktif + tabel list. Backend GET `/akun` & GET `/supplier` ditambahkan. |
| Dokumen Resmi (LPA/SPTJ/BAPSD) | ✅ | — | ✅ | ✅ | ✅ | Frontend: generator preview JSON + publish + tabel list terbitan. |
| Daftar Nominatif Upah | ✅ | — | ✅ | — | ✅ | Frontend: form + sub-form rincian harian + tabel list. |
| Approval | ✅ | — | ✅ | — | ✅ | Level: per hari (MenuHarian) & RabHarian. Akses eksklusif KEPALA_SPPG, mandatory periodeId, limit/offset pagination, status transition matrix & concurrency lock teruji. Halaman KepalaDashboard.jsx selesai. |
| Validasi Stok | ✅ | — | ✅ | ✅ | ✅ | Pelaksana: Akuntan. Endpoint POST (reconciliation), GET (list), dan GET preview kalkulator (agregasi MutasiStok masuk vs keluar) serta UI teruji. |
| Audit Log & Notifikasi | ✅ | — | ✅ | — | ✅ | Notifikasi selesai (terintegrasi dengan trigger POST approval & GET API user sendiri). Audit Log ditunda atas keputusan bisnis (YAGNI). |

## Ringkasan

Semua **schema** modul inti dan seluruh **API Backend + Query Laporan** telah diselesaikan sepenuhnya (100% closed & teruji). BKU, BP, LPA, SPTJ, BAPSD, KebutuhanBelanjaBahan, LaporanPerPeriode, LaporanPerBulan, dan StockBarang berhasil diimplementasikan dan lolos pengujian integrasi. Langkah selanjutnya adalah memulai pengembangan Frontend (Vite/React).
