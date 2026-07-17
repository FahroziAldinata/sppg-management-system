/**
 * HTML template untuk BKU (Buku Kas Umum / Catatan Pengeluaran Bulanan).
 * Field mapping:
 *   ringkasan: namaLembaga, alamat, periodeLabel, sisaDanaLalu,
 *     danaDiterimaSaatIni, danaTersedia, biayaBahanBaku,
 *     biayaOperasional, biayaInsentifFasilitas, totalPengeluaran,
 *     sisaDanaSaatIni
 *   transaksi: array of { bulan, tanggal, noBukti, Uraian, debet, kredit, saldoBerjalan, jumlah }
 */
const { escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

const NAMA_BULAN = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * @param {object} data - data untuk BKU
 * @returns {string} HTML string
 */
function renderBkuHtml(data) {
  const { ringkasan, transaksi } = data;
  const {
    namaLembaga = '',
    alamat = '',
    periodeLabel = '',
    sisaDanaLalu = 0,
    danaDiterimaSaatIni = 0,
    danaTersedia = 0,
    biayaBahanBaku = 0,
    biayaOperasional = 0,
    biayaInsentifFasilitas = 0,
    totalPengeluaran = 0,
    sisaDanaSaatIni = 0
  } = ringkasan || {};

  let formattedPeriode = periodeLabel;
  try {
    const parts = (periodeLabel || '').split(" - ");
    if (parts.length === 2) {
      const d1 = new Date(parts[0]);
      const d2 = new Date(parts[1]);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const d1Day = d1.getDate();
        const d2Day = d2.getDate();
        const d1Month = d1.toLocaleDateString('id-ID', { month: 'long' });
        const d2Month = d2.toLocaleDateString('id-ID', { month: 'long' });
        const d1Year = d1.getFullYear();
        const d2Year = d2.getFullYear();
        
        if (d1Month === d2Month && d1Year === d2Year) {
          formattedPeriode = `Periode : ${d1Day}-${d2Day} ${d1Month} ${d1Year}`;
        } else if (d1Year === d2Year) {
          formattedPeriode = `Periode : ${d1Day} ${d1Month} - ${d2Day} ${d2Month} ${d1Year}`;
        } else {
          formattedPeriode = `Periode : ${d1Day} ${d1Month} ${d1Year} - ${d2Day} ${d2Month} ${d2Year}`;
        }
      }
    }
  } catch (e) {
    console.error("Gagal memformat periodeLabel BKU:", e);
  }

  // Filter transaksi hanya yang KELUAR (kredit > 0)
  const filteredTransaksi = (transaksi || []).filter(t => Number(t.kredit) > 0);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Kas Umum — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    /* BKU-specific styling */
    .bku-identitas td { padding: 3px 0; font-size: 11pt; }
    .bku-identitas td:first-child { width: 140px; font-weight: bold; }
    
    .tabel-ringkasan-bku td {
      border: 1px solid #000;
      padding: 5px 8px;
    }
  </style>
</head>
<body>

  <h2 class="judul-dok" style="margin-top: 20px; text-align: center;">BUKU KAS UMUM</h2>
  <div style="text-align: center; font-size: 11pt; margin-bottom: 15px; font-weight: bold;">
    ${escapeHtml(formattedPeriode)}
  </div>

  <table class="bku-identitas" style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tbody>
      <tr>
        <td>Nama Lembaga</td>
        <td>: ${escapeHtml(namaLembaga)}</td>
      </tr>
      <tr>
        <td>Alamat</td>
        <td>: ${escapeHtml(alamat)}</td>
      </tr>
    </tbody>
  </table>

  <table class="tabel-ringkasan-bku" style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt;">
    <tbody>
      <tr>
        <td style="width: 70%;">Sisa dana yang lalu</td>
        <td style="text-align: right; width: 30%;">${formatNumberTabel(sisaDanaLalu)}</td>
      </tr>
      <tr>
        <td>Dana yang diterima saat ini</td>
        <td style="text-align: right;">${formatNumberTabel(danaDiterimaSaatIni)}</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Jumlah dana tersedia</td>
        <td style="text-align: right;">${formatNumberTabel(danaTersedia)}</td>
      </tr>
      <tr>
        <td>Biaya bahan baku</td>
        <td style="text-align: right;">${formatNumberTabel(biayaBahanBaku)}</td>
      </tr>
      <tr>
        <td>Biaya operasional</td>
        <td style="text-align: right;">${formatNumberTabel(biayaOperasional)}</td>
      </tr>
      <tr>
        <td>Biaya insentif fasilitas</td>
        <td style="text-align: right;">${formatNumberTabel(biayaInsentifFasilitas)}</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Total pengeluaran</td>
        <td style="text-align: right;">${formatNumberTabel(totalPengeluaran)}</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Sisa dana saat ini</td>
        <td style="text-align: right;">${formatNumberTabel(sisaDanaSaatIni)}</td>
      </tr>
    </tbody>
  </table>

  <table class="tabel-transaksi-bku" style="width: 100%; border: 1px solid #000; border-collapse: collapse; font-size: 10pt; page-break-inside: auto;">
    <thead>
      <tr style="background-color: #eaeaea; border-bottom: 1px solid #000;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 110px;">Bulan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 60px;">Tgl</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 120px;">No. Bukti</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Uraian Transaksi</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 130px;">Jumlah (Rp)</th>
      </tr>
      <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000; font-size: 9pt;">
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">1</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">2</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">3</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">4</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">5</th>
      </tr>
    </thead>
    <tbody>
      ${filteredTransaksi.length === 0 ? `
        <tr>
          <td colspan="5" style="border: 1px solid #000; padding: 12px; text-align: center; font-style: italic; color: #666;">
            Tidak ada transaksi pengeluaran pada periode ini.
          </td>
        </tr>
      ` : filteredTransaksi.map(row => {
          const dateParts = (row.tanggal || '').split('-');
          const tgl = dateParts.length === 3 ? parseInt(dateParts[2], 10) : '';
          const blnIndex = dateParts.length === 3 ? parseInt(dateParts[1], 10) : row.bulan || 1;
          const bulanNama = NAMA_BULAN[blnIndex] || '';
          
          return `
            <tr style="border-bottom: 1px solid #000; page-break-inside: avoid;">
              <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(bulanNama)}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(tgl)}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(row.noBukti || '—')}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: left;">${escapeHtml(row.uraian || '')}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: right; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.jumlah)}</td>
            </tr>
          `;
        }).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = { renderBkuHtml };
