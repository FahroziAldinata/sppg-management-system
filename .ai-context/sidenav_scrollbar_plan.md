# Rencana Solusi V2: Mengatasi Scrollbar Horizontal dengan Margin Cushion

Dokumen ini direvisi sesuai arahan Anda untuk **mempertahankan animasi hover geser samping (`translateX(4px)`) pada seluruh kontainer tombol**, dengan menerapkan ide pemberian margin kiri dan kanan pada tombol sebagai bantalan (cushion).

---

## 1. Analisis Ide Margin Kiri-Kanan

Saat ini, lebar bersih area navigasi `<nav>` adalah `218px` (tanpa scrollbar vertikal) atau `210px` (dengan scrollbar vertikal `8px`).

Jika tombol `<Link>` memiliki lebar `100%` tanpa margin:
- Saat hover, `translateX(4px)` menggeser seluruh tombol ke kanan sebesar 4px.
- Batas kanan tombol melampaui lebar kontainer navigasi, yang memicu munculnya scrollbar horizontal.

### Solusi dengan Margin Dinamis:
Jika kita memberikan margin kiri (`marginLeft`) dan margin kanan (`marginRight`) pada tombol menu:
1. Lebar tombol akan mengecil secara otomatis sebesar jumlah margin kiri + kanan.
2. Ketika tombol bergeser `4px` ke kanan saat hover, margin kanan berfungsi sebagai "ruang cadangan" (buffer). Batas kanan tombol yang tergeser tidak akan menabrak tepi kontainer navigasi.

### Formulasi Margin yang Estetis (Asimetris / Efek Penyeimbang):
Untuk membuat transisi terlihat sangat seimbang dan presisi:
- **Kondisi Normal (Default)**:
  - `marginLeft: '4px'`
  - `marginRight: '12px'`
  - Tombol akan tergeser sedikit ke kiri, dengan celah kanan lebih longgar.
- **Kondisi Hover (`translateX(4px)`)**:
  - Tombol bergeser `4px` ke kanan.
  - Secara visual, celah kiri bertambah menjadi `4px + 4px = 8px`.
  - Celah kanan berkurang menjadi `12px - 4px = 8px`.
  - **Hasil Akhir**: Saat di-hover, tombol akan terlihat **sempurna di tengah-tengah (centered)** dengan jarak `8px` kiri dan kanan!
  - Batas kanan terjauh tombol saat hover adalah `lebar_kontainer - 8px`, sehingga **tidak akan pernah memicu scrollbar horizontal**.

---

## 2. Rencana Perubahan Kode

Berikut draf perubahan pada `frontend/src/components/Layout.jsx`:

### A. Membatasi Scrollbar Horizontal pada Kontainer `<nav>`
Sebagai langkah pengaman tambahan, kita tetap menambahkan `overflowX: 'hidden'` agar browser tidak pernah memunculkan scrollbar horizontal.
```diff
-        <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
+        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
```

### B. Menerapkan Margin pada Fungsi `renderLink`
Kita tambahkan properti `marginLeft: '4px'` dan `marginRight: '12px'` pada gaya dasar `<Link>`:

```jsx
  const renderLink = (to, label, IconComponent) => {
    const active = isActive(to);
    return (
      <li>
        <Link
          to={to}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            marginLeft: '4px',          // Margin kiri default
            marginRight: '12px',        // Margin kanan default (cushion space)
            textDecoration: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: active ? '700' : '500',
            color: active ? 'var(--color-primary)' : 'var(--text)',
            backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
            boxShadow: active ? '0 2px 8px rgba(7, 30, 73, 0.08)' : 'none',
            border: active ? '1px solid rgba(7, 30, 73, 0.1)' : '1px solid transparent',
            transition: 'all var(--transition-fast), transform 0.2s ease-out'
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'var(--border)';
              e.currentTarget.style.borderRadius = '12px';
              e.currentTarget.style.transform = 'translateX(4px)'; // Pertahankan efek geser tombol
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderRadius = 'var(--radius-md)';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <IconComponent size={16} strokeWidth={active ? 2.5 : 2} style={{ color: active ? 'var(--color-primary)' : 'var(--text-muted)' }} />
          <span>{label}</span>
        </Link>
      </li>
    );
  };
```

### C. Menyelaraskan Tombol Footer (Settings & Logout)
Untuk menjaga konsistensi visual di bagian bawah sidebar agar sejajar dengan menu di atasnya, kita berikan margin yang sama (`marginLeft: '4px', marginRight: '12px'`):

1. **Pengaturan Profil (Settings Link)**:
```diff
          <Link
            to="/setting"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
+             marginLeft: '4px',
+             marginRight: '12px',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
              // ...
```

2. **Tombol Keluar (Logout Button)**:
```diff
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
-             width: '100%',
+             width: 'calc(100% - 16px)', // Menyesuaikan lebar setelah dikurangi margin kiri-kanan
+             marginLeft: '4px',
+             marginRight: '12px',
              background: 'none',
              // ...
```

---

## 3. Rencana Pengujian (Testing Plan)

1. **Verifikasi Tidak Ada Scrollbar**: Buka halaman dengan akun Akuntan yang memiliki menu sangat panjang. Scroll ke atas/bawah dan pastikan scrollbar horizontal tidak lagi muncul di navigasi.
2. **Keseimbangan Visual (Hover State)**: Arahkan kursor ke tombol menu. Amati pergeseran `translateX(4px)`. Tombol harus bergeser dengan mulus dan menghasilkan celah kiri-kanan yang sama rata (8px) saat aktif/hover, menciptakan tampilan melayang yang modern dan konsisten.
