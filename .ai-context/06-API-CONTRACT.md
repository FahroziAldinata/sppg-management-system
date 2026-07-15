# 07 — API Contract (Landing Dashboard Summary)

Dokumen ini mendefinisikan kontrak API untuk endpoint dashboard baru yang menyajikan ringkasan eksekutif dan kemajuan operasional (6-stage workflow) lintas role di SIKOP-SPPG.

---

## 📌 1. GET `/api/dashboard/summary`

Endpoint ini dipanggil oleh semua role saat memuat halaman Landing Dashboard utama untuk mengambil data metrik ringkasan.

*   **Autentikasi**: Required (`requireAuth`)
*   **Role**: Semua Role (`ASLAP`, `MITRA`, `AHLI_GIZI`, `AKUNTAN`, `KEPALA_SPPG`)
*   **Method**: `GET`
*   **Query Params**:
    *   `periodeId` (Optional): ID periode tertentu. Jika kosong, backend otomatis mengambil periode berstatus `AKTIF` atau `DRAFT` terbaru.

### Response Shape (Sukses - `200 OK`):

```json
{
  "success": true,
  "data": {
    "periode": {
      "id": "cuid-periode-123",
      "tanggalMulai": "2026-07-01",
      "tanggalSelesai": "2026-07-14",
      "status": "AKTIF",
      "anggaranAlokasi": 120000000.00,
      "totalDanaDiterima": 100000000.00
    },
    "metrics": {
      "totalPenerimaManfaat": 1250,
      "pendingApprovalsCount": 4,
      "akgRataRata": {
        "energi": 92.5,
        "protein": 88.0,
        "lemak": 95.2,
        "karbohidrat": 90.1
      },
      "lastReconciliationDate": "2026-07-06"
    },
    "workflowProgress": {
      "currentStage": 4,
      "stages": [
        { "stage": 1, "name": "Setup Periode & Lembaga", "status": "COMPLETED", "updatedAt": "2026-07-01T08:00:00.000Z" },
        { "stage": 2, "name": "Input Penerima Manfaat", "status": "COMPLETED", "updatedAt": "2026-07-02T10:30:00.000Z" },
        { "stage": 3, "name": "Daftar Harga Bahan Pokok", "status": "COMPLETED", "updatedAt": "2026-07-02T15:45:00.000Z" },
        { "stage": 4, "name": "Penyusunan Menu Harian", "status": "IN_PROGRESS", "updatedAt": "2026-07-03T11:20:00.000Z" },
        { "stage": 5, "name": "Pembuatan PO (Nota Pesanan)", "status": "PENDING", "updatedAt": null },
        { "stage": 6, "name": "Persetujuan Kepala SPPG", "status": "PENDING", "updatedAt": null }
      ]
    }
  }
}
```

---

## 🛠️ 2. Pemetaan Sumber Data (Source Fields) & [ASUMSI]

Berikut adalah pemetaan data dari skema database riil PostgreSQL:

1.  **`metrics.totalPenerimaManfaat`**:
    *   **Source**: Agregasi `SUM(lakiLaki) + SUM(perempuan)` dari tabel `InputPenerimaManfaatDetail` yang terikat pada `periodeId` terpilih.
2.  **`metrics.pendingApprovalsCount`**:
    *   **Source**: Hitungan baris (`count`) `MenuHarian` berstatus `DIAJUKAN` + `RabHarian` berstatus `DIAJUKAN` pada `periodeId` terpilih.
3.  **`metrics.akgRataRata`**:
    *   **Source**:
        *   Hitung total gizi terealisasi per blok menu: `SUM(MenuItemBahan.energiKkal)` dll.
        *   Bandingkan dengan target: `MenuTargetGizi.targetEnergi` dll.
        *   Ambil rata-rata persentase pemenuhan (`%`) lintas seluruh blok menu yang ada pada periode tersebut.
4.  **`metrics.lastReconciliationDate`**:
    *   **Source**: Tanggal maksimum (`MAX(tanggal)`) dari tabel `ValidasiStok` pada periode terpilih (pencatat rekonsiliasi stok fisik).

---

## 🔄 3. Opsi Implementasi 6-Stage Workflow Progress

Untuk melacak status 6 tahap di `workflowProgress`, terdapat dua alternatif desain yang membutuhkan keputusan pengguna:

### Opsi A: Dihitung secara Dinamis (Dynamic Live Check) — [ASUMSI RECOMMENDED]
*   **Kelebihan**: Bebas dari modifikasi schema/migration database (`schema.prisma` tidak diubah).
*   **Cara Kerja**: Backend mengecek keberadaan relasi data secara live pada query `GET`:
    *   **Stage 1 (Setup Periode)**: `COMPLETED` jika ada record `SetupLembaga` untuk `periodeId` terkait.
    *   **Stage 2 (Input PM)**: `COMPLETED` jika ada record `InputPenerimaManfaat` untuk `periodeId` terkait.
    *   **Stage 3 (Harga Bahan)**: `COMPLETED` jika ada record `HargaBahanPeriode` untuk `periodeId` terkait.
    *   **Stage 4 (Menu Harian)**: `COMPLETED` jika ada record `MenuHarian` untuk `periodeId` terkait. `IN_PROGRESS` jika status menu masih `DRAFT`.
    *   **Stage 5 (Buat PO)**: `COMPLETED` jika ada record `TransaksiPembelian` (Nota Pesanan) untuk `periodeId` terkait.
    *   **Stage 6 (Approval)**: `COMPLETED` jika status seluruh `MenuHarian` dan `RabHarian` sudah `DISETUJUI`.

### Opsi B: Menggunakan Kolom Status Baru (Schema & Migration DB)
*   **Kelebihan**: Status tersimpan eksplisit di database, mempercepat query pembacaan.
*   **Kekurangan**: Perlu memodifikasi `schema.prisma`, membuat migrasi, dan mengubah status secara transaksional di backend saat tiap role menyelesaikan aksi mereka.
*   **Perubahan Skema Usulan**:
    ```prisma
    enum WorkflowStage {
      SETUP_PERIODE
      INPUT_PM
      INPUT_HARGA
      SUSUN_MENU
      BUAT_PO
      APPROVAL
    }

    model Periode {
      // ... field existing
      tahapProgress WorkflowStage @default(SETUP_PERIODE)
    }
    ```
