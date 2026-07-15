# 05 — Status Modul

Legenda: ✅ selesai · 🟡 sebagian/ada gap · ⬜ belum mulai

| Modul | Schema | Seed | API | Query laporan | Frontend | Catatan |
|---|---|---|---|---|---|---|
| User & Auth | ✅ | ✅ | ✅ | — | ✅ | JWT stateless, `requireAuth`/`requireRole` di `src/middleware/auth.js` |
| Periode & SetupLembaga | ✅ | ✅ (1 contoh) | ✅ | — | ✅ | Setup periode baru & SetupLembaga terintegrasi di frontend (autofill otomatis dari data historis). Layout diselaraskan Flexbox Row. |
| Taksonomi (KategoriPenerima, KelompokUmurMenu, BatasHargaPorsi) | ✅ | ✅ | ✅ | — | ✅ | Mapping many-to-many sudah diseed sesuai v5.3. API GET kelompok-umur-menu dan dropdown UI terintegrasi. |
| Aslap — Input Penerima Manfaat | ✅ | ✅ (Sekolah & Posyandu) | ✅ | — | ✅ | `hariAktif` array (v5), validasi non-overlap dengan row lock (`SELECT FOR UPDATE`), dan findOrCreate sekolah/posyandu selesai |
| Aslap — Jumlah Per Kelas | ✅ (pembantu) | — | ✅ | — | ✅ | `SekolahKelasDetail` CRUD selesai |
| Mitra — Harga Bahan | ✅ | — | ✅ | — | ✅ | CRUD HargaBahanPeriode & read-only BahanPokok selesai |
| Stok (Saldo/Masuk/Keluar) | ✅ | ✅ (Bahan) | ✅ | ✅ | ✅ | Backend & Frontend selesai. Form MutasiStok & SaldoAwalBarang terintegrasi. Perbaikan bug StockBarang lintas-periode (gte periode.tanggalMulai) diaplikasikan. |
| Validasi Stok | ✅ | — | ✅ | ✅ | ✅ | Backend & Frontend selesai (preview, reconciliation, list). |
| Menu (Master, Harian, Blok, Item, Bahan, Target Gizi, Organoleptik) | ✅ | — | ✅ | ✅ | ✅ | CRUD MenuHarianBlok, MenuItem, MenuItemBahan, TargetGizi, Organoleptik, & MasterMenuMingguan selesai di frontend. |
| Alergi | ✅ (v5) | — | ✅ | ✅ | ✅ | AlergiCatatan CRUD selesai (frontend & backend). |
| Pengiriman (Kendaraan) | ✅ (v5) | ✅ | ✅ | — | ✅ | CRUD Kendaraan & PengirimanHarian selesai di backend & frontend. |
| RAB Harian & Pembelian | ✅ | — | ✅ | — | ✅ | CRUD RabHarian selesai. Frontend: form create + tabel list di dashboard. |
| Anggaran Resmi (AnggaranHarian) | ✅ | — | ✅ | — | ✅ | CRUD AnggaranHarian selesai. Frontend: form conditional (BAHAN_MAKANAN rincian vs flat) + tabel list. |
| Ledger (Akun, Jurnal, SaldoAwal) | ✅ | ✅ (Akun) | ✅ | ✅ | ✅ | Frontend: form + dropdown akun aktif + tabel list. Backend GET `/akun` & GET `/supplier` ditambahkan. |
| Dokumen Resmi (LPA/SPTJ/BAPSD) | ✅ | — | ✅ | ✅ | ✅ | PDF generation via puppeteer-core + @sparticuz/chromium, layout sesuai format asli BGN (LPA/SPTJ/BAPSD/BKU seluruhnya closed). |
| Daftar Nominatif Upah | ✅ | — | ✅ | — | ✅ | Frontend: form + sub-form rincian harian + tabel list. |
| Approval | ✅ | — | ✅ | — | ✅ | Level: per hari (MenuHarian) & RabHarian. Akses eksklusif KEPALA_SPPG, mandatory periodeId, limit/offset pagination, status transition matrix & concurrency lock teruji. Halaman KepalaDashboard.jsx selesai. |
| Validasi Stok | ✅ | — | ✅ | ✅ | ✅ | Pelaksana: Akuntan. Endpoint POST (reconciliation), GET (list), dan GET preview kalkulator (agregasi MutasiStok masuk vs keluar) serta UI teruji. |
| Audit Log & Notifikasi | ✅ | — | ✅ | — | ✅ | Notifikasi selesai (terintegrasi dengan trigger POST approval & GET API user sendiri). Audit Log ditunda atas keputusan bisnis (YAGNI). |

## Ringkasan

Semua **schema** modul inti, **API Backend**, **Query Laporan**, serta **UI/UX Frontend (Vite/React)** telah diselesaikan sepenuhnya (100% completed & teruji). Desain layout form setup/setting telah diselaraskan dengan Flexbox row, dan efek transisi dropdown telah dinonaktifkan secara global di seluruh aplikasi. Sistem siap untuk dideploy.
