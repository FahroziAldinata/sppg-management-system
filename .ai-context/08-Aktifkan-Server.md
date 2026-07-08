```powershell
# Masuk ke direktori backend
cd E:\Project\Sistem_SPPG\backend
node index.js

cd D:\Project\Sistem\Sistem_SPPG\backend
node index.js
```


## 🌐 Langkah 2: Jalankan Aplikasi Frontend (React + Vite)


```powershell

cd e:\Project\Sistem_SPPG\frontend
npm run dev

cd D:\Project\Sistem\Sistem_SPPG\frontend
npm run dev
```



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
