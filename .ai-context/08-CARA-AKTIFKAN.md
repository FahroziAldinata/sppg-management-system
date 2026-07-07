# Panduan Menjalankan Aplikasi Sistem SPPG (Backend & Frontend)

Ikuti langkah-langkah di bawah ini untuk menjalankan server backend dan aplikasi frontend secara manual.

---

## 🖥️ Langkah 1: Jalankan Server Backend (Express.js)

Buka terminal baru (PowerShell / Command Prompt), lalu jalankan perintah berikut:

```powershell
# Masuk ke direktori backend
cd E:\Project\Sistem_SPPG\backend

# Jalankan server
node index.js
```

**Tanda Berhasil:**  
Terminal akan menampilkan pesan:  
`◇ injected env (2) from .env`  
`Server jalan di port 3000`

---

## 🌐 Langkah 2: Jalankan Aplikasi Frontend (React + Vite)

Buka terminal kedua secara terpisah, lalu jalankan perintah berikut:

```powershell
# Masuk ke direktori frontend
cd e:\Project\Sistem_SPPG\frontend

# Jalankan dev server Vite
npm run dev
```

**Tanda Berhasil:**  
Terminal akan menampilkan informasi URL lokal seperti:  
`  ➜  Local:   http://localhost:5173/`

---

## 🔑 Langkah 3: Akses Aplikasi di Browser

Buka browser Anda (Google Chrome / Edge) dan buka alamat:  
👉 **[http://localhost:5173](http://localhost:5173)**

### Akun Login Manual untuk Uji Coba:
Gunakan kredensial berikut untuk menguji alur multi-role (Password untuk semua akun adalah: **`ganti-password-ini`**):

| Role | Username | Kegunaan Utama |
|------|----------|----------------|
| **Asisten Lapangan (ASLAP)** | `aslap` | Input Penerima Manfaat harian |
| **Mitra Penyedia (MITRA)** | `mitra` | Input Harga Bahan Pokok & Nota Pesanan (PO) |
| **Ahli Gizi (AHLI_GIZI)** | `ahligizi` | Menyusun Rencana Menu Harian |
| **Akuntan (AKUNTAN)** | `akuntan` | Menginput Jurnal, Mutasi, validasi stok, cetak BKU & LPA |
| **Kepala Satuan (KEPALA_SPPG)** | `kepalasppg` | Approval RAB & Menu, memantau realisasi |
