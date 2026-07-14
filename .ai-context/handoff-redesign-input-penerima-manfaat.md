# Handoff — Redesign Alur Input Penerima Manfaat (Role: Aslap)

Copy-paste seluruh isi file ini sebagai prompt pembuka di sesi baru.

---

## Peran kamu

Senior software engineer, kerjakan implementasi (schema + backend + frontend) berdasar hasil analisis di bawah. User kerja **manual, tanpa agent/tool run** — kasih instruksi persis: file mana, migration apa, function mana, kode siap copy-paste. Gaya: **ponytail** (minimal, jangan over-engineer) + **caveman** (prose singkat).

## Project context

SIKOP-SPPG — sistem keuangan & operasional SPPG (program MBG/BGN). Stack: React (Vite) + Node/Express + Prisma + PostgreSQL (Supabase). Periode kerja 2 minggu. 5 role: Aslap, Mitra, Ahli Gizi, Akuntan, Kepala SPPG.

Task ini fokus ke **role Aslap**, khususnya form input "Penerima Manfaat" — trigger pembuka tiap periode baru.

## Masalah yang mau diselesaikan

Alur input sekarang (asumsi implementasi saat ini, **cek dulu ke kode aktual sebelum ubah**): user pilih kategori dulu, baru pilih sekolah/posyandu → 1 sekolah SD butuh diinput ulang di **3 baris terpisah** (kategori `SD_1_3`, `SD_4_6`, `TENAGA_KEPENDIDIKAN`) karena tiap kombinasi (kategori × sekolah) = 1 row manual. Ini "kerja berganda" — nama sekolah yang sama diketik/dipilih berkali-kali.

Contoh data real dari Excel Aslap (rujukan kebutuhan, BUKAN untuk di-hardcode):
```
PAUD/TK/RA/TKLB          → TK Amanah              (12 L, 11 P)
SD Kelas 1-3             → SDN Wanajaya           (16 L, 11 P)
SD Kelas 4-6             → SDN Wanajaya           (18 L, 17 P)   <- sekolah SAMA, baris beda
Tenaga Kependidikan      → SDN Wanajaya           (2 L, 8 P)     <- sekolah SAMA lagi, baris ke-3
SMA/SMK Kelas 4-6        → SMK Pelita Al-Ikhsan   (81 L, 76 P)
ATS Usia < 9 Tahun       → -  (tidak ada sekolah)  (0, 0)
ATS Usia 9-18 Tahun      → -  (tidak ada sekolah)  (0, 0)
Pendidik                 → (semua baris di contoh ini 0 — LIHAT catatan di bawah)
```

## Kesimpulan desain (SUDAH DIPUTUSKAN via analisis, jangan didebat ulang tanpa alasan baru)

### 1. Field baru: `Sekolah.jenjang`

Tambah enum di schema:
```prisma
enum JenjangSekolah {
  TK
  SD
  SMP
  SMA_SMK
}

model Sekolah {
  // ...field existing tetap
  jenjang JenjangSekolah
}
```
- **Konfirmasi user:** 1 sekolah = 1 jenjang tetap. Sekolah "satu atap" (SD+SMP sama nama) itu **2 entity Sekolah terpisah** di DB (mis. "SD Budi Mulia" dan "SMP Budi Mulia" adalah 2 row `Sekolah` beda), BUKAN 1 sekolah multi-jenjang. Jadi `jenjang` aman jadi single-value enum, **tidak perlu array**.
- Data existing: perlu migration + backfill `jenjang` utk sekolah yang udah ada (mapping manual/dari nama, direview manual — jangan asal regex nama karena rawan salah).

### 2. Mapping jenjang → kategori yang auto-muncul di form

| `jenjang` | Kategori yang otomatis di-render |
|---|---|
| `TK` | `PAUD_TK` |
| `SD` | `SD_1_3` **+** `SD_4_6` (dua-duanya sekaligus) |
| `SMP` | `SMP_1_3` |
| `SMA_SMK` | `SMA_SMK_4_6` |

Ditambah, **selalu muncul apapun jenjangnya**, karena terikat ke sekolah yang sama (bukan angka global):
- `PENDIDIK`
- `TENAGA_KEPENDIDIKAN`

⚠️ **Koreksi penting:** sempat dipertimbangkan `PENDIDIK` sebagai 1 angka global (bukan per-sekolah), tapi user konfirmasi itu salah — kadang ada pendidik dari 1 sekolah spesifik minta menu (jarang, tapi harus tetap tercatat per-sekolah untuk audit). Jadi **`PENDIDIK` treatment-nya identik dengan `TENAGA_KEPENDIDIKAN`**: field per-sekolah, default 0, opsional diisi.

### 3. `Posyandu` — tanpa field tambahan

Pilih Posyandu → langsung 4 field fixed: `BALITA`, `BUMIL`, `BUSUI`, `KADER_POSYANDU`. Tidak ada percabangan jenjang (semua Posyandu sama).

### 4. Kategori ATS (`ATS_KURANG_9TH`, `ATS_9_18TH`) — standalone, auto-created, tanpa entity

- Kedua kategori ini **tidak terikat ke Sekolah maupun Posyandu** (kolom nama-sekolah di Excel isinya `-`).
- **Wajib selalu ada row-nya tiap periode**, walau isinya 0 — untuk audit trail/transparansi ("terlihat memang 0, bukan lupa input"). User eksplisit: *"tetap aja dibuat dalam periode itu"*.
- Implikasi schema: kategori ini butuh pengecualian di validasi. Komentar existing di schema bilang "tepat satu dari sekolahId/posyanduId terisi (divalidasi app-layer)" untuk `jenisSasaran = PESERTA_DIDIK`. **Longgarkan validasi ini khusus untuk `kategori.kode IN ('ATS_KURANG_9TH', 'ATS_9_18TH')`** — keduanya boleh null.
- Implikasi backend: begitu `InputPenerimaManfaat` (periode) dibuat, backend **auto-create** 2 row `InputPenerimaManfaatDetail` untuk kategori ATS dengan `lakiLaki: 0, perempuan: 0` sebagai default — tidak menunggu user memilih apapun (beda dari kategori sekolah/posyandu yang cuma dibuat kalau entity-nya dipilih user).

### 5. Alur UI form Aslap (final)

1. **Section atas, fixed, selalu tampil** (tidak terikat pilihan apapun): `ATS Usia < 9 Tahun` (L/P), `ATS Usia 9-18 Tahun` (L/P). Default 0.
2. **Tombol "Tambah Sekolah"** → pilih 1 Sekolah dari dropdown → sistem baca `jenjang` sekolah tsb → auto-render field sesuai tabel mapping poin 2 (termasuk Pendidik + Tenaga Kependidikan). Bisa tambah banyak sekolah (repeatable block).
3. **Tombol "Tambah Posyandu"** → pilih 1 Posyandu → 4 field fixed muncul. Bisa tambah banyak posyandu.
4. **Submit 1x** untuk seluruh periode → backend expand semua block jadi banyak row `InputPenerimaManfaatDetail`, semua row dalam 1 sekolah share `sekolahId` yang sama (tidak perlu user pilih sekolah berkali-kali).

### 6. Fitur tambahan: scroll-to-first-error saat validasi gagal

Form ini berpotensi panjang (banyak block sekolah/posyandu berulang). Kalau user submit dan ada field kosong yang wajib diisi, **jangan cuma tampilin pesan error generik** ("ada field yang kosong") — user harus dituntun langsung ke field yang bermasalah, tanpa scroll manual.

**Perilaku yang diharapkan:**
1. Validasi jalan saat submit (client-side, sebelum hit API).
2. Field pertama yang kosong/invalid (urutan dari atas ke bawah DOM) — otomatis:
   - Halaman `scroll` ke posisi field tsb (`scrollIntoView({ behavior: 'smooth', block: 'center' })`).
   - Field itu dapat `focus()`.
   - Border/style field itu berubah jadi state error (pakai `isInvalid` dari react-aria-components kalau field-nya dari `TextField`/`Field.jsx` — sudah ada varian `isInvalid` di `fieldBorderStyles`, tinggal pakai).
3. Kalau ada beberapa field kosong sekaligus, cukup arahkan ke yang **pertama** dulu — setelah itu diisi & submit ulang, baru ke error berikutnya (jangan tampilkan semua sekaligus biar gak overwhelming, tapi ini bisa didiskusikan sama user kalau mau approach beda).
4. Pesan error tetap tampil (mis. `FieldError` dari `Field.jsx`) di bawah field yang error — scroll+focus ini pelengkap, bukan pengganti pesan teks.

**Implementasi teknis (garis besar, detail nanti pas ngoding):**
- Tiap field butuh `ref` yang bisa diakses buat `scrollIntoView`/`focus`.
- Kalau formnya dinamis (block sekolah/posyandu bisa nambah berkali-kali), pertimbangkan simpan refs dalam `useRef(new Map())` atau array of refs, keyed by field id (mis. `sekolahBlock-{index}-lakiLaki`), bukan `useRef` statis satu-satu.
- react-aria-components sudah expose `isInvalid` state ke styling — cek apakah cukup pakai itu, atau perlu state error manual (`useState` object `{fieldId: errorMessage}`) kalau validasi custom (misal cross-field, atau "minimal satu sekolah harus diisi").

## Yang HARUS dicek dulu sebelum mulai coding (jangan asumsi)

1. Lihat kode aktual: apakah alur input sekarang beneran "pilih kategori dulu, baru sekolah" seperti yang dianalisis, atau ada logic lain yang belum kelihatan di analisis ini. Minta user tunjukin file controller/route + komponen form React yang relevan.
2. Lihat full `model Periode` dan `model User` (belum pernah dikasih ke sesi analisis) — dibutuhin kalau bikin seed data atau endpoint baru.
3. Cek apakah ada data production/testing existing di tabel `Sekolah` yang perlu backfill `jenjang` — kalau ada, rencanakan migration + data-fix terpisah dari migration schema (jangan campur dalam 1 migration Prisma yang auto-run).
4. Konfirmasi ke user: endpoint submit form ini bikin **endpoint baru** (backend expand payload) atau logic expand-nya cukup di **frontend** (kirim array detail siap-pecah, endpoint lama tetap dipakai apa adanya). Ini nentuin scope kerja jauh lebih kecil/besar.
5. Untuk fitur scroll-to-error (poin 6): cek dulu apakah form Aslap yang sekarang pakai komponen `TextField`/`Field.jsx` yang sudah support `isInvalid`, atau masih pakai `<input>` polos — ini nentuin apakah fitur ini "tinggal pasang" atau butuh refactor field dulu.

## Cara mulai

Jangan langsung tulis migration/kode. Tanya user dulu urutan kerja yang mau duluan:
- (a) migration schema (`jenjang` di `Sekolah` + relaksasi validasi ATS), atau
- (b) desain endpoint/payload dulu (baru schema menyusul kalau perlu).