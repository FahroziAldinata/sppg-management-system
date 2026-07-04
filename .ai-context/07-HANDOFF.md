# Handoff — Sinkronisasi Sesi AI

Dibuat: 2026-07-04. Update tiap akhir sesi jika ada perubahan signifikan.

## Status Terakhir

### ✅ Modul CLOSED (jangan diubah tanpa alasan kuat):
| Modul | Catatan |
|---|---|
| Auth | `req.user = { sub, username, role, nama }` |
| Aslap | InputPenerimaManfaat + SekolahKelasDetail |
| Mitra | HargaBahanPeriode + read-only BahanPokok |
| Ahli Gizi | Full menu, alergi, pengiriman, kendaraan |
| Akuntan — RabHarian | CRUD selesai |
| Akuntan — AnggaranHarian | CRUD + recalcAktualAnggaran |
| Akuntan — JurnalTransaksi | POST/GET/PUT/DELETE + validasi akun aktif |
| Akuntan — DokumenResmi | LPA/SPTJ/BAPSD live generator |
| Akuntan — DaftarNominatifUpah | CRUD + cascade DaftarNominatifUpahHarian |
| Akuntan — SaldoAwalBarang | POST (P2002, validasi bahanPokok.aktif) |
| Akuntan — MutasiStok MASUK | POST (field isolation ketat) |

### ⬜ Pending (urutan prioritas):
1. **MutasiStok KELUAR** — branch `jenis === "KELUAR"` di `POST /mutasi-stok` masih 501. **TANYA USER DULU**: apakah perlu validasi saldo cukup sebelum implement.
2. **Query harga beli terbaru** — MAX(tanggal) per bahanPokokId dari MutasiStok MASUK.
3. **Modul Kepala SPPG** — Approval MenuHarian & RabHarian.
4. **Frontend** — belum dimulai.

## Aturan Wajib (Jangan Salah Lagi)
- `createdById: req.user.sub` — BUKAN `req.user.id`
- `normalizeDateUTC(tanggal)` — WAJIB untuk semua field tanggal dari client
- Error prefix: `[NOT_FOUND]` → 404, `[VALIDASI]` → 400, `[CONFLICT]` → 409
- `P2002` → 409, `P2025` → 404, `P2003` → 404
- Validasi `bahanPokok.aktif === true` sebelum semua operasi stok
- `$transaction` untuk semua operasi atomik

## Pertanyaan Terbuka untuk User
1. **Validasi saldo cukup MutasiStok KELUAR**: boleh qty KELUAR > saldo tersedia, atau harus diblokir?
