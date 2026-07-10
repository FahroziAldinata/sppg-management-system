# Task: Fix scroll horizontal di sidebar navigasi

## Masalah
Sidebar navigasi (sidenav) menampilkan scrollbar horizontal yang tidak
seharusnya ada. Dugaan awal: ada animasi/transform pada state hover tombol
menu (misal `scale()`, `translateX()`, atau `box-shadow` yang melebar) yang
membuat lebar elemen efektif melebihi batas container sidenav, sehingga
browser memunculkan scrollbar horizontal.

## Yang harus dilakukan

1. **Cari file component + CSS sidenav** di project ini (biasanya nama
   folder/file mengandung `Sidebar`, `SideNav`, `Nav`, atau ada di
   `layout/`/`components/`).
2. **Analisa root cause**, cek satu-satu:
   - Apakah ada `:hover` state pada item menu yang pakai `transform: scale(...)`,
     `translateX(...)`, `margin`, atau `width` yang berubah dan menyebabkan
     box melebar ke kanan?
   - Apakah item menu punya `white-space: nowrap` sementara sidenav punya
     `width` tetap (cek variable seperti `--sidebar-width` di token CSS) —
     kalau label teks lebih panjang dari lebar sidenav, ini penyebabnya.
   - Apakah container sidenav sudah punya `overflow-x` di-set secara
     eksplisit? Kalau belum di-set sama sekali (default `visible`), ini
     penyebab paling umum.
3. **Terapkan fix root cause** (bukan cuma nutup gejala), prioritas:
   - Kalau elemen yang melebar itu memang by-design (animasi hover
     dimaksudkan terlihat), kunci di level container:
     ```css
     .sidenav /* ganti sesuai class/selector asli */ {
       overflow-x: hidden;
       overflow-y: auto;
     }
     ```
   - Kalau elemen melebar itu bug (gak sengaja, misal box-shadow tanpa
     `box-sizing` yang benar atau padding dobel), perbaiki di sumbernya,
     bukan cuma disembunyikan pakai `overflow-x: hidden`.
4. Setelah fix, pastikan **animasi hover tetap berfungsi secara visual**
   (jangan sampai `overflow: hidden` malah motong animasi jadi keliatan
   aneh/terpotong) — kalau iya, laporkan balik, jangan langsung commit.
5. Cek juga apakah masalah yang sama ada di elemen sejenis lain di project
   ini (topbar, tab navigation, dll yang punya pola hover serupa) —
   selesaikan sekalian kalau root cause-nya sama, jangan tunggu dilaporkan
   satu-satu.

## Constraint
- Jangan ubah `--sidebar-width` atau ukuran container lain kecuali itu
  memang akar masalahnya dan sudah dikonfirmasi lewat analisa di atas.
- Style pakai CSS variable dari `tokens.css` yang sudah ada di project ini
  — jangan hardcode warna/ukuran baru.
- Laporkan file + selector CSS yang diubah, dengan penjelasan singkat kenapa
  itu akar masalahnya (bukan cuma "sudah difix").
