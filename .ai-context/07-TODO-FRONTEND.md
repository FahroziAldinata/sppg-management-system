Frontend TODO — staged, backbone dulu, styling belakangan.
Tahap 0 — Setup (sebelum ngoding page)

 - [x] Vite scaffold + react-router-dom v6 + folder struktur (udah dikonfirm agent kemarin)
 - [x] .env frontend (VITE_API_URL=http://localhost:3000/api atau port backend aktual)
 - [x] AuthContext — login/logout/token persist localStorage, load user on mount
 - [x] ProtectedRoute component — cek token + role match
 - [x] useApi hook / fetch wrapper — attach Bearer token, handle 401 (auto logout+redirect login)

Tahap 1 — Validasi pola (1 role: Aslap)

 - [x] Login page (form polos, no styling)
 - [x] Layout shell (nav/sidebar bare — cuma link + logout button)
 - [x] Aslap: list InputPenerimaManfaat (GET, table polos)
 - [x] Aslap: form create (POST, validasi error tampil apa adanya)
 - [x] Aslap: edit/delete
 - [x] Test manual: login → CRUD → logout → token expired handling
 - [x] Mitra: HargaBahanPeriode CRUD (udah selesai)
 - [x] Ahli Gizi: MenuHarian (list + create periode, table polos)
 - [x] Ahli Gizi: MenuHarianBlok CRUD (tambah/hapus/list blok per kelompok umur)
 - [x] Ahli Gizi: MenuItem CRUD per blok (form & list)
 - [x] Ahli Gizi: MenuItemBahan CRUD (10 field gizi manual, computed, & local mapping)
 - [x] Ahli Gizi: MenuTargetGizi (list & create-only per blok)
 - [x] Ahli Gizi: MenuOrganoleptik CRUD per blok
 - [x] Ahli Gizi: AlergiCatatan CRUD per blok
 - [x] Ahli Gizi: Kendaraan CRUD & PengirimanHarian (selesai, teruji manual)
 - [x] Ahli Gizi: MasterMenuMingguan (form create + read-only list, selesai)
Tahap 2 — Replicate ke role lain
 - [x] Akuntan: AkuntanDashboard.jsx (selesai)
    - [x] RAB Harian (form create + tabel list read-only)
    - [x] Anggaran Harian (form conditional BAHAN_MAKANAN vs flat + tabel list)
    - [x] Jurnal Transaksi (form + dropdown akun aktif + tabel list)
    - [x] Dokumen Resmi (generator preview JSON + publish + tabel list)
    - [x] Daftar Nominatif Upah (form + sub-form rincian harian + tabel list)
    - [x] GET /api/akuntan/supplier endpoint (pola identik GET /akun)
    - [x] Sticky error div (UX fix — error visible saat scroll)
    - [x] MutasiStok (form create + dropdown supplier/bahanPokok)
    - [x] ValidasiStok (preview + reconciliation)
    - [x] SaldoAwalBarang (form create)
 - [x] Kepala SPPG: Approval list + action + Notifikasi badge (selesai)
    - [x] GET /api/notifikasi (endpoint backend baru untuk user sendiri)
    - [x] Integrasi route /kepala dan link nav Layout.jsx untuk KEPALA_SPPG

Tahap 3 — Laporan (read-only, low-risk)

 Wrap 9 endpoint laporan jadi halaman view (tabel polos dulu)

Tahap 4 — Baru styling

 Setelah semua tahap 1-3 functional & lo udah cek sendiri alurnya bener
 Kamu kasih arahan visual (warna/layout/spacing), diterapin sekaligus ke semua halaman yang udah jadi

Progress-tracking: bikin file baru 07-TODO-FRONTEND.md di project (bukan overwrite 04-TODO.md — itu punya backend). Update per tahap kelar, sama pola kayak 02-PROGRESS.md.