/**
 * HTML template untuk LPA (Laporan Penggunaan Anggaran).
 * Field mapping 1:1 ke output generateLPA dari 06-QUERY-REFERENCE.md:
 *   nomorDokumen, periodeLabel, namaPejabat, jabatan, namaLembaga,
 *   rincian[].label / .diajukan / .terealisasi / .sisa,
 *   total.diajukan / .terealisasi / .sisa,
 *   nomorRekeningVA, tempatPelaporan, tanggalPelaporan,
 *   namaYayasan, ketuaYayasan, namaAkuntan
 */
const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS } = require('./shared');

// Keterangan statis per kategori dana (hardcode per ASUMSI di 08-PLAN-LAYOUT-DOKUMEN.md)
const KETERANGAN_KATEGORI = {
  'Bahan Baku': 'Pengadaan bahan baku utama untuk pelaksanaan kegiatan.',
  'Operasional': 'Penggunaan dana untuk biaya persiapan, pengolahan, distribusi, dan administrasi pelayanan.',
  'Sewa': 'Penggunaan dana untuk insentif tenaga masak, kader, dan biaya utilitas/fasilitas pelayanan.',
};

/**
 * @param {object} data - output dari GET /api/laporan/lpa (data field)
 * @returns {string} full HTML string siap di-render puppeteer
 */
function renderLpaHtml(data) {
  const {
    nomorDokumen,
    periodeLabel,
    namaPejabat,
    jabatan,
    namaLembaga,
    rincian,
    total,
    nomorRekeningVA,
    tempatPelaporan,
    tanggalPelaporan,
    namaYayasan,
    ketuaYayasan,
    namaAkuntan,
    alamat,
    isLr,
  } = data;

  // Format tanggal pelaporan
  const tglPelaporanStr = tanggalPelaporan
    ? new Date(tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_______________';
  const tempatTglStr = `${escapeHtml(tempatPelaporan || '')}, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${tglPelaporanStr}`;

  // Baris rincian tabel
  const rincianRows = rincian.map(r => `
    <tr>
      <td class="col-label">${escapeHtml(r.label)}</td>
      <td class="col-amount">${formatNumberTabel(r.diajukan)}</td>
      <td class="col-amount">${formatNumberTabel(r.terealisasi)}</td>
      <td class="col-amount">${formatNumberTabel(r.sisa)}</td>
    </tr>
  `).join('');

  // Baris total
  const totalRow = `
    <tr class="baris-total">
      <td class="col-label">Total</td>
      <td class="col-amount col-total-amount">${formatNumberTabel(total.diajukan)}</td>
      <td class="col-amount col-total-amount">${formatNumberTabel(total.terealisasi)}</td>
      <td class="col-amount col-total-amount">${formatNumberTabel(total.sisa)}</td>
    </tr>
  `;



  // Footer TTD: 2 kolom (Pihak Pertama kiri, Pihak Kedua kanan) + Mengetahui Kepala SPPG terpisah di bawah
  const footerTTD = `
    ${renderFooterTTD([
      { label: 'Pihak Pertama,', org: namaYayasan, nama: ketuaYayasan || '', jabatanBawah: 'Ketua/Mewakili' },
      { label: 'Pihak Kedua,',   jabatan: `Akuntan SPPG ${namaLembaga}`,    nama: namaAkuntan || '' },
    ], tempatTglStr)}
    ${renderFooterTTD([
      { label: 'Mengetahui,', jabatan: `Kepala SPPG ${namaLembaga}`, nama: namaPejabat || '' }
    ], '')}
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${isLr ? 'Laporan Resume Penerimaan dan Pengeluaran' : `LPA — ${escapeHtml(nomorDokumen)}`}</title>
  <style>
    ${SHARED_CSS}
    /* LPA-specific */
    .identitas-lembaga { margin-bottom: 12px; }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok">${isLr ? 'Laporan/Resume Penerimaan dan Pengeluaran' : 'Laporan Penggunaan Anggaran'}</h2>
  ${isLr ? '' : `<div class="nomor-dok">Nomor: <span class="highlight">${escapeHtml(nomorDokumen)}</span></div>`}
  <div class="periode-label" style="text-align: left; font-weight: bold; margin-bottom: 4px;">Periode: ${escapeHtml(periodeLabel)}</div>
  <p style="margin: 0 0 4px 0; font-size: 11pt;">Yang bertanda tangan di bawah ini:</p>

  <table class="identitas-lembaga" style="margin-bottom:6px;">
    <tbody>
      <tr>
        <td>Nama Pejabat</td>
        <td>: ${escapeHtml(namaPejabat)}</td>
      </tr>
      <tr>
        <td>Jabatan</td>
        <td>: ${escapeHtml(jabatan)}</td>
      </tr>
      <tr>
        <td>Nama Lembaga</td>
        <td>: ${escapeHtml(namaLembaga)}</td>
      </tr>
    </tbody>
  </table>

  <p class="pembuka">Dengan ini menyatakan bahwa laporan penggunaan dana adalah sebagai berikut:</p>

  <table class="tabel-rincian">
    <thead>
      <tr>
        <th class="col-label">I. RINCIAN KEGIATAN</th>
        <th class="col-amount">Dana Diajukan (Rp)</th>
        <th class="col-amount">Dana Terealisasi</th>
        <th class="col-amount">Sisa Dana (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${rincianRows}
      ${totalRow}
    </tbody>
  </table>

  <div class="keterangan-section">
    <p class="section-title" style="margin: 0;">II. KETERANGAN</p>
    <p style="margin-bottom: 4px;">Dana yang telah digunakan sesuai dengan kebutuhan kegiatan yang telah direncanakan, dengan rincian sebagai berikut:</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 11pt; margin-bottom: 4px;">
      <tbody>
        <tr>
          <td style="width: 210px; padding: 2px 0; vertical-align: top;">Bahan Baku</td>
          <td style="padding: 2px 0; vertical-align: top;">: Pengadaan bahan baku utama untuk pelaksanaan kegiatan</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; vertical-align: top;">Operasional</td>
          <td style="padding: 2px 0; vertical-align: top;">: Biaya untuk transportasi, ATK, konsumsi, dan keperluan teknis lainnya.</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; vertical-align: top;">Insentif Fasilitas</td>
          <td style="padding: 2px 0; vertical-align: top;">: Bangunan, mobil, dll.</td>
        </tr>
        ${nomorRekeningVA ? `
        <tr>
          <td style="padding: 2px 0; vertical-align: top;">Nomor rekening/Virtual Account</td>
          <td style="padding: 2px 0; vertical-align: top;">: ${escapeHtml(nomorRekeningVA)}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>
    <p style="margin-top: 4px;">Sisa dana sebesar Rp${total.sisa},- akan dialihkan ke periode selanjutnya.<br>
    Pengalihan sisa dana ini bertujuan untuk mendukung kegiatan yang telah direncanakan.</p>
  </div>

  ${footerTTD}
</body>
</html>`;
}

module.exports = { renderLpaHtml };
