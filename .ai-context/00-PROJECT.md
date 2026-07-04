# Sistem Keuangan & Operasional SPPG MBG

## Apa ini

Sistem web untuk mencatat keuangan, perencanaan menu, dan validasi stok di satu
Satuan Pelayanan Pemenuhan Gizi (SPPG) dalam program Makan Bergizi Gratis (MBG)
di bawah Badan Gizi Nasional (BGN).

Periode kerja: 2 minggu (bukan 1 minggu — sudah direvisi dari draf awal).

## Siapa yang pakai (4 role)

1. **Aslap** (Asisten Lapangan) — input jumlah penerima manfaat per periode
   (porsi kecil vs porsi besar). Ini adalah trigger pembuka tiap periode baru.
2. **Mitra** — update harga bahan pokok tiap periode. Independen dari aslap,
   tapi harus selesai sebelum ahli gizi mulai susun menu.
3. **Ahli Gizi** — susun menu dari nol tiap periode (bukan template berulang),
   tentukan kuantitas bahan per porsi kecil/besar, catat nilai gizi (AKG) dan
   mutu (uji organoleptik: rasa, aroma, tekstur, suhu saji).
4. **Akuntan** — kelola anggaran, hitung total biaya dari menu vs anggaran
   tersedia, tracking pengeluaran kas, generate laporan periodik. Berwenang
   memutuskan revisi jika anggaran minus.

## Alur kerja inti (lihat 01-ARCHITECTURE.md untuk detail skema)

```
Aslap input penerima manfaat
        |
        v
   (paralel, tidak saling tunggu)
   Mitra update harga bahan ----+
        |                       |
        v                       v
   Ahli gizi susun menu (qty per porsi kecil/besar, total kebutuhan bahan)
        |
        v
   Akuntan hitung total biaya vs anggaran
        |
        +-- cukup -> approved, periode terkunci, lanjut ke pelaksanaan dapur
        |
        +-- minus -> balik ke ahli gizi untuk revisi menu (loop)
```

Setelah periode disetujui dan berjalan, aslap melakukan validasi stok fisik
yang dicocokkan dengan catatan pengeluaran akuntan (rekonsiliasi).

## Tech stack

- Platform: Web app (browser, multi-device)
- Backend: Node.js + Express
- Frontend: React (Vite)
- ORM: Prisma
- Database: PostgreSQL, di-host via Supabase (free tier)
- Auth: Custom (session/JWT sederhana) — tidak pakai library OAuth berat,
  karena hanya 4 role tetap (aslap, mitra, ahli_gizi, akuntan)
- Hosting backend: Render (free web service)
- Hosting frontend: Vercel atau Render Static Site
- Hosting database: Supabase (free tier, tidak auto-expire 30 hari seperti
  Render Postgres)

Alasan & detail lengkap ada di 03-DECISIONS.md bagian "Tech stack dipilih".

