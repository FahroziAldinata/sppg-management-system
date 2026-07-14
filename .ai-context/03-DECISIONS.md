# 03 — Decisions

Keputusan berstatus **FINAL** tidak diubah tanpa alasan kuat (data sumber baru yang jelas-jelas kontradiksi, bukan sekadar preferensi). Kalau ada perubahan, catat di sini + alasan + tanggal, jangan overwrite diam-diam.

## Tech stack (FINAL)

Node.js + Express, React (Vite), Prisma ORM, PostgreSQL, auth custom (bukan OAuth library, cuma 4 role tetap). Hosting rencana: Render (backend) + Vercel/Render Static (frontend) + Supabase (database, free tier tidak auto-expire).

Prisma **di-pin ke v6**, bukan v7 — v7 mindahin `datasource.url` keluar schema ke `prisma.config.ts` + wajib driver adapter. Ditunda sampai ada alasan kuat upgrade.

Database dev: **PostgreSQL lokal** (diinstall di mesin dev, port 5432) dipakai untuk `prisma migrate dev` selama setup awal. Supabase tetap rencana untuk staging/production sesuai `00-PROJECT.md` — **belum diputuskan** apakah dev seterusnya pakai lokal atau langsung pindah ke Supabase dari awal (lihat `04-TODO.md`).

## Arsitektur data (FINAL)

- Sistem keuangan = general ledger double-entry (`Akun` + `JurnalTransaksi` + `SaldoAwalPeriode`, carry-forward otomatis). Semua buku pembantu & laporan periodik di-generate dari jurnal, bukan tabel terpisah.
- RAB Harian ≠ RAB Periode sebagai tabel — RAB Periode = agregasi SUM query harian.
- `TransaksiPembelian` (rencana operasional/pembelian) terpisah dari `JurnalTransaksi` (akuntansi riil) — tidak auto-link.
- Revisi RAB pasca-approval: akuntan koreksi langsung + `AuditLog`, tidak perlu approval ulang.
- Nomor dokumen resmi (LPA/SPTJ/BAPSD): input manual/fleksibel akuntan, data tetap LIVE (bukan snapshot terkunci saat generate).
- Taksonomi kategori penerima **disatukan jadi 1** (`KategoriPenerima`, 13 kategori resmi BGN) — Akuntan tidak punya taksonomi kasar sendiri, dia pakai kategori resmi yang sama dengan Aslap. `KategoriRAB` yang sempat dibuat sudah **dihapus**.
- Nilai gizi (kalori/protein/lemak/karbo/serat) di Menu = **100% manual** per baris bahan (dari rujukan TKPI eksternal). Sistem tidak boleh auto-hitung/mengarang rumus konversi gizi.

## Koreksi terhadap keputusan lama (dicatat biar tidak dianggap inkonsistensi)

- **v5**: Granularitas hari input Aslap awalnya diasumsikan final "2 opsi" (`SENIN_JUMAT` | `SABTU`). **DIKOREKSI** setelah user konfirmasi eksplisit kombinasi hari bebas (mis. "Selasa & Kamis saja" juga valid). Enum `KelompokHari` dihapus, diganti `hariAktif HariMenu[]` di `InputPenerimaManfaat`.
- **v5**: Modul stok (`MutasiStok`) awalnya ditandai SPEKULATIF (dugaan dari nama sheet Excel yang belum pernah dilihat). **DIKONFIRMASI** setelah user kasih field asli 4 sheet (Saldo_Brg/Masuk/Keluar/Stock_Brg) — struktur diperbaiki sesuai field asli, label spekulatif dicabut.

## Gap yang sudah ditutup

- **Pajak**: tidak perlu logika hitung/potong otomatis. Akuntan input manual ke `JurnalTransaksi` ke akun bertipe `PAJAK`, diperlakukan sama seperti transaksi lain.
- **Daftar Nominatif Upah** (`danaKesehatan`/`tk`/`pj`): dikonfirmasi input manual **per relawan per periode** (bukan per-hari), dari screenshot header sheet asli. `HONORARIUM SUKARELAWAN` dan `TOTAL UPAH` tetap nilai turunan (SUM), bukan kolom tersimpan.
- **"Jumlah Per Kelas"**: dikonfirmasi tabel pembantu/audit-trail murni (`SekolahKelasDetail`) — angka mentah per kelas yang dijumlah Aslap manual jadi bucket `KategoriPenerima`. Tidak dipakai modul lain, tidak jadi sumber baca laporan resmi.
- **Kode akun 4-digit** (v5.5, FINAL): dikonfirmasi ke akuntan asli — kode `2120` **bukan bug**. Operasional sengaja cuma punya **1 akun gabungan** (dana masuk & biaya keluar dicatat di akun yang sama, "dananya sama"), beda dari Bahan Baku & Insentif Fasilitas yang dipisah Dana vs Biaya. Kode final: `2110`/`2190` (Bahan Baku Dana/Biaya), `2120` (Operasional, 1 akun), `2130`/`2121` (Insentif Fasilitas Dana/Biaya). Tidak ada perubahan schema, hanya seed data.
- **Struktur LPA/SPTJ/BAPSD** (v5.4): dicek terhadap surat asli. Semua field pejabat/lembaga (nama Kepala SPPG, Akuntan, Yayasan, Ketua Yayasan, alamat, no rekening/VA, tempat & tanggal pelaporan, tanggal periode berikutnya) sudah tercakup di `SetupLembaga`, tidak perlu tabel/field baru. Angka finansial (Dana Diajukan/Terealisasi/Sisa) selalu dihitung LIVE dari `AnggaranHarian` + `JurnalTransaksi`, tidak disimpan. Catatan: LPA pakai label "Sewa" di tabel rincian, sama artinya dengan "Insentif Fasilitas" di keterangan (istilah lama, kategori dana sama).
- **Nomor bukti jurnal**: RESET per periode (`@@unique([periodeId, nomorBukti])` sudah pas, tidak perlu perubahan schema). History tetap bisa ditelusuri lintas periode karena `periodeId` selalu tersimpan.
- **jenisPorsi staf & ATS**: DIKONFIRMASI oleh BGN & akuntan (bukan rekomendasi lagi) — Pendidik/Tenaga Kependidikan/Kader Posyandu = BESAR, ATS 9-18th = BESAR, ATS <9th = KECIL.
- **Query BKU, BP, LPA, SPTJ, BAPSD** (v5.6, FINAL — siap implementasi): semua fungsi generate lengkap ada di `06-QUERY-REFERENCE.md`, pakai nama field asli dari schema (`AnggaranHarian.rab`/`aktual`/`kategoriDana` — sudah dicek langsung ke model, bukan tebakan lagi). `aktual` adalah kolom tersimpan yang di-maintain via `recalcAktualAnggaran` tiap ada `JurnalTransaksi` baru — laporan baca dari kolom ini, tidak scan ulang jurnal tiap generate. Arah Debet/Kredit di jurnal relatif — `JurnalTransaksi.jenis` (MASUK/KELUAR) dari sudut pandang `akunKas`, kebalik kalau yang direport `akunDanaBiaya`.
- **Mapping KelompokUmurMenu → KategoriPenerima** (v5.3): relasi diubah jadi many-to-many. SMP & SMA/SMK berbagi 1 menu (tidak dibedakan level, beda dgn SD yg dibedakan 1-3/4-6). Pendidik & Tenaga Kependidikan berbagi 1 menu (grup "PIC_SEKOLAH").
- **Siklus MasterMenuMingguan** (v5.3, KOREKSI): bukan template wajib yg diulang — menu bisa berubah tiap hari ikut anggaran & ketersediaan porsi. `MenuHarianBlok` adalah satu-satunya sumber kebenaran, tidak divalidasi terhadap master mingguan.
- **Level approval Menu** (v5.3): dikonfirmasi per HARI, semua blok kelompok umur sekaligus (bukan per blok).
- **DB dev**: tetap pakai PostgreSQL lokal (bukan Supabase) untuk sekarang.
- **Validasi User Aktif pada Middleware (v5.7, FINAL)**: JWT stateless tetap diverifikasi tandatangannya, namun untuk mencegah celah keamanan di mana token staf yang telah dinonaktifkan/resign tetap valid hingga masa kadaluarsa token habis, ditambahkan query `User.findUnique({ where: { id: sub }, select: { aktif: true } })` pada setiap request di `requireAuth`. Jika user tidak ditemukan atau `aktif === false`, langsung kembalikan respon `401 Unauthorized`.
- **Validasi Rentang Tanggal MenuHarian (v5.8, FINAL)**: Tanggal MenuHarian wajib berada dalam rentang `Periode.tanggalMulai` hingga `Periode.tanggalSelesai` (inklusif). Jika di luar batas rentang periode tersebut, request ditolak dengan status `400 Bad Request`. Dikonfirmasi resmi oleh user.
- **Validasi Status Aktif Kendaraan (v5.9, FINAL)**: Kendaraan wajib bertatus aktif (`aktif === true`) untuk dapat digunakan mengirim porsi makanan harian pada POST/PUT `PengirimanHarian`. Ditandai dengan tag `[ASUMSI]`.
- **Subtotal Transaksi Pembelian (v5.10, FINAL)**: `TransaksiPembelianItem.subtotal` dihitung langsung di tingkat aplikasi (`qty * hargaSatuan`), bukan dibaca mentah dari payload request.
- **Validasi Rentang Tanggal RabHarian (v5.11, FINAL)**: Tanggal RabHarian wajib berada dalam rentang `Periode.tanggalMulai` hingga `Periode.tanggalSelesai` (inklusif), sejajar dengan aturan v5.8 MenuHarian.
- **Ubah Status RabHarian (v5.12, FINAL)**: PUT `/rab-harian/:id` oleh Akuntan hanya diperbolehkan memperbarui status ke `DRAFT` atau `DIAJUKAN`. Mengubah status ke `DISETUJUI` atau `DITOLAK` dilarang (wajib melalui alur Approval oleh Kepala SPPG).
- **Kategori tanpa jenisPorsi tidak bisa dianggarkan (v5.13, FINAL)**: Kategori penerima yang `jenisPorsi`-nya bernilai null dilarang untuk dianggarkan pada `AnggaranHarian` dan diblokir dengan status `400 Bad Request`.
- **Ubah KategoriDana AnggaranHarian (v5.14, FINAL)**: Perubahan `kategoriDana` pada `AnggaranHarian` diblokir (status `409 Conflict`) jika nilai `aktual` tidak sama dengan 0 (yaitu telah terhubung dengan transaksi pembukuan riil di ledger/jurnal).
- **Hapus Dokumen Resmi tanpa Lock Periode ([ASUMSI])**: Operasi DELETE dokumen resmi saat ini tidak memblokir/mengecek status Periode (dokumen yang sudah terbit bisa dihapus kapan saja).
- **Update Jurnal Transaksi ([ASUMSI])**: JurnalTransaksi bersifat editable dengan kebijakan reverse + recalculation (Opsi B) terhadap realisasi anggaran lama dan baru secara otomatis.
- **Ketiadaan AuditLog di DB ([ASUMSI])**: Tidak ada log audit tertulis saat DELETE dokumen resmi/RAB/anggaran karena skema database saat ini belum mendukung tabel AuditLog.

- **`recalcAktualAnggaran` (FINAL)**: Fungsi `recalcAktualAnggaran(tx, periodeId, tanggal, kategoriDana)` sudah diimplementasikan. Dipanggil di dalam `$transaction` yang sama pada setiap POST/PUT/DELETE `JurnalTransaksi`. Filter `tipe: "BIAYA"` diterapkan pada SUM agar jurnal ke akun DANA tidak ikut terhitung sebagai realisasi.
- **`normalizeDateUTC` (FINAL)**: Helper util untuk normalisasi tanggal ke UTC midnight agar tidak ada timezone drift. Field `tanggal` dari client WAJIB date-only string "YYYY-MM-DD". Dipakai di semua endpoint yang menerima field tanggal (JurnalTransaksi, MutasiStok).
- **SaldoAwalBarang tanpa pengecekan status Periode ([ASUMSI])**: Pembuatan `SaldoAwalBarang` diizinkan kapan saja tanpa memedulikan status `Periode` (DRAFT/AKTIF/SELESAI). Tidak ada lock berbasis lifecycle periode.
- **Isolasi field kondisional MutasiStok ([ASUMSI, FINAL])**: Field `supplierId` + `hargaBeli` WAJIB diisi hanya untuk jenis MASUK, dan DIBLOKIR untuk jenis KELUAR. Sebaliknya, `kelompokPenerima` WAJIB diisi hanya untuk jenis KELUAR, dan DIBLOKIR untuk jenis MASUK. Validasi dilakukan app-layer secara ketat (bukan hanya nullable di schema).
- **Validasi saldo cukup MutasiStok KELUAR ([ASUMSI] — OPSI A)**: Sesuai prinsip *ponytail*, tidak ada validasi kuantitas (qty) KELUAR terhadap saldo tersedia. Stok bisa minus. Sistem hanya melakukan pencatatan transaksi mutasi, rekonsiliasi dilakukan secara manual.
- **Validasi akun aktif di PUT JurnalTransaksi ([ASUMSI])**: Validasi hanya mengecek akun yang baru (yang diubah). Jika akun tidak diubah (menggunakan akun lama dari database), maka tidak divalidasi ulang untuk mengecek status aktifnya.
- **Tampilan periode di dropdown Mitra/Gizi/Aslap (FINAL)**: Format tanggal di `<option>` diseragamkan menjadi `YYYY-MM-DD - YYYY-MM-DD` (tanggal mulai s/d tanggal selesai) agar format seragam dan tanpa "keterangan" tambahan di dropdown. ID `p.id` tetap sebagai nilai `value` (kunci primer), tidak diganti teks tanggal.
- **Filter Periode di MenuHarianList (FINAL)**: Endpoint `/gizi/menu-harian?periodeId=...` dispesifikasikan hanya mengembalikan data `MenuHarian` yang `tanggal` berada di dalam rentang `tanggalMulai`–`tanggalSelesai` dari periode yang diminta, tidak mengambil data berdasarkan `id` menu yang kebetulan cocok dengan ID periode.
- **Role mapping frontend (FINAL)**: Role `AHLI_GIZI` untuk frontend disamakan dengan role `AHLI_GIZI` di backend (tanpa tambahan `_ADMIN`). Frontend menggunakan satu guard `allowedRoles={['AHLI_GIZI']}` untuk halaman menu harian.
- **Struktur halaman MenuHarian (FINAL)**: Halaman tersebut hanya berisi tabel daftar `MenuHarian` per periode, tanpa form pembuatan `MenuItem`, `MenuTargetGizi`, `MenuOrganoleptik`, atau `AlergiCatatan` — data tersebut rencananya dikelola di halaman terpisah yang belum diimplementasikan.
- **Penyediaan Endpoint KelompokUmurMenu (v5.15, FINAL)**: Mengingat dropdown kelompok umur menu diperlukan di halaman MenuHarianBlok, ditambahkan endpoint GET `/api/gizi/kelompok-umur-menu` di backend yang dapat diakses oleh role ASLAP, KEPALA_SPPG, AHLI_GIZI, dan AKUNTAN.
- **Persistensi State Menu Detail (v5.16, FINAL)**: Query pada GET `/menu-harian` dan GET `/menu-harian/:id` di backend dimodifikasi untuk selalu menyertakan (`include`) relasi `organoleptik`, `alergi`, dan `menuItem: { include: { bahan: true } }` di bawah model `blok` agar data persist penuh di frontend saat halaman di-refresh.
- **MenuTargetGizi Edit UI ([ASUMSI])**: Form edit (PUT) untuk Target Gizi belum diimplementasikan di frontend (sementara create-only) mengikuti prinsip penyederhanaan UI (ponytail).
- **Sampel Chiller & Retensi Organoleptik (v5.17, FINAL)**: Model `MenuOrganoleptik` ditambahkan kolom `jumlahOmpreng` (default 1) dan `tanggalMusnah`. Pada POST/PUT `/menu-organoleptik`, sistem otomatis menghitung `tanggalMusnah` dengan formula `ujiPadaTanggal + 3 hari` (memenuhi standar retensi sampel makanan 3 hari di chiller).
- **Penanganan Constraint Violation Hapus Kendaraan (v5.18, FINAL)**: Pada `DELETE /api/gizi/kendaraan/:id`, error handler dimodifikasi agar turut menangkap kode error PostgreSQL `23001` (RESTRICT violation) dan substring `"foreign key constraint"` / `"violates RESTRICT"` yang dilempar sebagai `PrismaClientUnknownRequestError` oleh Prisma, sehingga API mengembalikan status `409 Conflict` dengan pesan error yang tepat alih-alih status `500`.
- **Menonaktifkan Animasi Dropdown Global (v5.19, FINAL)**: Semua transisi dan animasi CSS pada tag `<select>` dinonaktifkan secara global di `index.css` agar interaksi drop-down bernilai instan tanpa ada visual delay.
- **Penyelarasan Layout Form & Tata Letak Flex (v5.20, FINAL)**: Form Setup Periode (`PeriodeSetupPage.jsx`) dan form Pengaturan Akun (`SettingPage.jsx`) direfaktor tata letaknya menggunakan Flexbox Row responsif (`display: 'flex', gap: '15px', flexWrap: 'wrap'` dengan anak wrapper `flex: '1 1 200px'`) agar selaras dengan layout form Jurnal Transaksi yang telah disetujui sebelumnya. Untuk input di dalam fieldset Setup Periode, background tetap dipertahankan `var(--bg-elevated)` demi kontras visual di atas latar belakang `var(--bg)`.
- **Standarisasi React Aria Components & Migrasi Jurnal (v5.21, FINAL)**: Menghapus `CustomSelect.jsx` dan memigrasi seluruh input di `JurnalTransaksiPage.jsx` ke React Aria Components (DatePicker, TextField, ComboBox, dan Button). Seluruh input RAC distandarisasi ukurannya (tinggi 42px, radius `--radius-sm`, background `--bg`, padding 10px 12px) dengan spacing teks yang lega (padding-left 12px) untuk menghilangkan visual bug. Tombol utama/primer/sekunder RAC diubah dari tinggi tetap 42px menjadi tinggi alami menggunakan padding `py-3 px-6` (vertical 12px, horizontal 24px) sesuai spesifikasi baru, sementara tombol quiet menggunakan `py-1.5 px-3`. Halaman Jurnal Transaksi kini 100% menggunakan komponen baru.

## Open Risks (Belum Diputuskan)

*(Tidak ada open risk saat ini.)*

## Keputusan Baru

- **PDF Generation — puppeteer-core + @sparticuz/chromium (v5.22, FINAL, 2026-07-14)**: Untuk render PDF dokumen resmi (LPA/SPTJ/BAPSD/BKU), dipakai `puppeteer-core` + `@sparticuz/chromium` — BUKAN `puppeteer` full bundle. Alasan: Render free tier hanya 512MB RAM; Chromium full (~170–200MB download) berisiko OOM kill + build timeout. `@sparticuz/chromium` adalah serverless Chromium build yang di-compress ~40MB dan sudah teruji di Render/Lambda/Vercel. `executablePath` diperoleh via `chromium.executablePath()`, `args` via `chromium.args`, identik pola standar serverless-safe. Auth endpoint PDF tetap pakai `requireAuth` header Bearer. Frontend membuka PDF via fetch+blob+`URL.createObjectURL`, bukan `window.open` langsung ke URL endpoint (karena `window.open` tidak bisa inject header Authorization). objectURL di-revoke setelah 30 detik (delay untuk beri waktu browser load PDF).