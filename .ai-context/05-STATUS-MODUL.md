# 05 — Status Modul

Legenda: ✅ selesai · 🟡 sebagian/ada gap · ⬜ belum mulai

| Modul | Schema | Seed | API | Query laporan | Frontend | Catatan |
|---|---|---|---|---|---|---|
| User & Auth | ✅ | ✅ | ✅ | — | ⬜ | JWT stateless, `requireAuth`/`requireRole` di `src/middleware/auth.js` |
| Periode & SetupLembaga | ✅ | ✅ (1 contoh) | ⬜ | — | ⬜ | |
| Taksonomi (KategoriPenerima, KelompokUmurMenu, BatasHargaPorsi) | ✅ | ✅ | ⬜ | — | ⬜ | Mapping many-to-many sudah diseed sesuai v5.3 |
| Aslap — Input Penerima Manfaat | ✅ | ⬜ | ✅ | ⬜ | ⬜ | `hariAktif` array (v5), validasi non-overlap dengan row lock (`SELECT FOR UPDATE`), dan findOrCreate sekolah/posyandu selesai |
| Aslap — Jumlah Per Kelas | ✅ (pembantu) | ⬜ | ✅ | — | ⬜ | `SekolahKelasDetail` CRUD selesai, tidak dipakai laporan resmi |
| Mitra — Harga Bahan | ✅ | ⬜ | ✅ | — | ⬜ | CRUD HargaBahanPeriode & read-only BahanPokok selesai |
| Stok (Saldo/Masuk/Keluar) | ✅ (v5, terkonfirmasi) | ⬜ | ⬜ | ⬜ | ⬜ | Query harga beli terbaru (MAX tanggal) belum ditulis |
| Menu (Master, Harian, Blok, Item, Bahan, Target Gizi, Organoleptik) | ✅ | ⬜ | ✅ | ⬜ | ⬜ | Nilai gizi manual, jangan bikin auto-calc. MasterMenuMingguan diselesaikan. |
| Alergi | ✅ (v5) | — | ✅ | ⬜ | ⬜ | AlergiCatatan CRUD selesai. |
| Pengiriman (Kendaraan) | ✅ (v5) | ✅ | ✅ | — | ⬜ | CRUD Kendaraan & PengirimanHarian selesai. |
| RAB Harian & Pembelian | ✅ | ⬜ | ✅ | — | ⬜ | CRUD RabHarian selesai dengan manual cascade delete dan JurnalTransaksi conflict check. |
| Anggaran Resmi (AnggaranHarian) | ✅ | ⬜ | ✅ | — | ⬜ | CRUD AnggaranHarian selesai dengan BatasHargaPorsi validation dan non-zero aktual check. |
| Ledger (Akun, Jurnal, SaldoAwal) | ✅ | ✅ (Akun) | 🟡 | ✅ | ⬜ | Kode akun final v5.5, JurnalTransaksi POST/GET/PUT selesai |
| Dokumen Resmi (LPA/SPTJ/BAPSD) | ✅ | ⬜ | ✅ | ✅ | ⬜ | Live generator, list, publish, delete selesai |
| Daftar Nominatif Upah | ✅ | ⬜ | ✅ | — | ⬜ | CRUD DaftarNominatifUpah + detailHarian selesai |
| Approval | ✅ | — | ⬜ | — | ⬜ | Level: per hari (MenuHarian), asumsi belum dikonfirmasi eksplisit |
| Validasi Stok | ✅ | — | ⬜ | ⬜ | ⬜ | Pelaksana diasumsikan Akuntan |
| Audit Log & Notifikasi | ✅ | — | ⬜ | — | ⬜ | |

## Ringkasan

Semua **schema** modul inti sudah selesai (v5.2) dan sudah ter-migrate ke DB lokal. **API untuk modul User & Auth, Aslap, Mitra, dan Ahli Gizi telah diselesaikan sepenuhnya (100% closed).** Modul Akuntan sedang dalam pengerjaan (dimulai dengan POST `/rab-harian`).Prioritas berikutnya: menyelesaikan sisa API modul Akuntan dan Kepala SPPG → baru frontend.
