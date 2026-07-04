TUGAS: Bangun frontend (Tahap 0 + Tahap 1, 07-TODO-FRONTEND.md). Bebas 
berkreasi UI/UX — styling, layout, animasi, desain terserah kamu. Yang GAK 
BOLEH cuma 1: data/API-nya harus asli, nyambung ke backend yang sudah jadi.

ATURAN KERAS — DILARANG:
1. DILARANG data dummy/mock/hardcoded di komponen manapun. Semua data WAJIB 
   dari fetch call ke backend asli (VITE_API_URL).
2. DILARANG bikin mock API/fake response/placeholder JSON "biar UI keliatan 
   duluan". Backend endpoint gagal/belum jalan → tampilin error state asli, 
   JANGAN ditutupin data palsu.
3. DILARANG nebak nama field request/response body. WAJIB dicocokkan ke 
   route handler backend asli — baca source-nya langsung, kutip potongan 
   kode itu di laporan kamu sebagai bukti (bukan cuma bilang "sudah sesuai").
4. Ragu soal endpoint/body/response shape → baca dulu file route handler, 
   jangan lanjut ngoding pakai tebakan.

YANG DIKERJAKAN (fungsi dulu, tampilan bebas kamu desain):
1. Setup: Vite + React + react-router-dom v6.
2. AuthContext — token+user state, login()/logout(), persist localStorage, 
   restore session via GET /api/auth/me pakai token asli.
3. ProtectedRoute — cek token+role asli dari AuthContext.
4. Fetch wrapper — attach Bearer token asli, handle 401 dari backend asli.
5. Login page — submit ke POST /api/auth/login asli, tampilin error message 
   asli dari API.
6. Layout — nav/sidebar, desain bebas kamu.
7. Aslap: list (GET asli) + create form (POST asli) + edit/delete — field 
   form HARUS match persis field yang backend expect.

SEBELUM NULIS KODE: baca route handler `aslap.js` & `auth.js` backend, 
pastiin field/endpoint/response shape. Kutip potongan kode itu di laporan.

STOP setelah Aslap kelar, jangan lanjut role lain dulu.

Upload biar konteks kejaga penuh tiap sesi baru:
Wajib tiap sesi baru:

03-DECISIONS.md — FINAL rules, paling sering dicek pas review
05-STATUS-MODUL.md — status modul kekinian
02-PROGRESS.md — kronologis progress
04-TODO.md (backend) + 07-TODO-FRONTEND.md (kalau udah dibikin)

Kalau ada perubahan:

schema.prisma — kalau abis ada migration baru
06-QUERY-REFERENCE.md — kalau nyentuh laporan lagi

Optional, cuma kalau relevan ke topik direview:

00-PROJECT.md, 01-ARCHITECTURE.md — jarang berubah, gak perlu tiap sesi