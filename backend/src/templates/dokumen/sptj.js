/**
 * HTML template untuk SPTJ (Surat Pernyataan Tanggung Jawab).
 * Field mapping 1:1 ke output generateSPTJ:
 *   namaPejabat, jabatan, jumlahPenerimaan, jumlahPengeluaran, sisaDana,
 *   tempatPelaporan, tanggalPelaporan, tahunAnggaran, namaLembaga
 */
const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * @param {object} data - data untuk SPTJ
 * @returns {string} HTML string
 */
function renderSptjHtml(data) {
  const {
    namaPejabat,
    jabatan,
    jumlahPenerimaan,
    jumlahPengeluaran,
    sisaDana,
    tempatPelaporan,
    tanggalPelaporan,
    tahunAnggaran,
    namaLembaga,
    alamat
  } = data;

  const tglPelaporanStr = tanggalPelaporan
    ? new Date(tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_______________';
  const tempatTglStr = `${escapeHtml(tempatPelaporan || '')}, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${tglPelaporanStr}`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SPTJ — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    /* SPTJ-specific styling */
    .sptj-pembuka { margin: 20px 0 10px 0; line-height: 1.6; }
    .sptj-identitas { margin-bottom: 20px; }
    .sptj-identitas td { padding: 4px 8px; font-size: 11pt; }
    .sptj-identitas td:first-child { width: 150px; font-weight: bold; }
    .sptj-paragraf { text-indent: 30px; text-align: justify; line-height: 1.6; margin-bottom: 20px; }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat, logoFileName: 'logo-sptj.png' })}

  <h2 class="judul-dok" style="margin-top: 20px;">Surat Pernyataan Tanggung Jawab</h2>

  <div class="sptj-pembuka">Saya yang bertanda tangan di bawah ini:</div>
  
  <table class="sptj-identitas">
    <tbody>
      <tr>
        <td>Nama</td>
        <td>: ${escapeHtml(namaPejabat)}</td>
      </tr>
      <tr>
        <td>Jabatan</td>
        <td>: ${escapeHtml(jabatan)}</td>
      </tr>
    </tbody>
  </table>

  <p class="sptj-paragraf">
    menyatakan bertanggung jawab secara formal dan material atas penerimaan dan pengeluaran dana yang dilaksanakan dengan menggunakan dana APBN TA ${escapeHtml(tahunAnggaran || '2026')} melalui DIPA Badan Gizi Nasional TA ${escapeHtml(tahunAnggaran || '2026')}, dengan mata anggaran sebagai Bantuan Pemerintah untuk Program Makan Bergizi Gratis. Sebagaimana Surat Pernyataan Tanggung Jawab penggunaan anggaran <span style="color:#1a4fa0; font-weight:bold;">Bahan Baku/Operasional/Insentif Fasilitas</span> beserta bukti-bukti pengeluaran yang sah dengan rincian:
  </p>

  <table style="width: 80%; margin: 20px auto; border-collapse: collapse; font-size: 11pt;">
    <tbody>
      <tr>
        <td style="width: 250px; padding: 4px 0; vertical-align: top;">1. Jumlah Penerimaan</td>
        <td style="width: 20px; padding: 4px 0; vertical-align: top;">:</td>
        <td style="padding: 4px 0; vertical-align: top; text-align: right;">${formatNumberTabel(jumlahPenerimaan)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; vertical-align: top;">2. Jumlah Pengeluaran</td>
        <td style="padding: 4px 0; vertical-align: top;">:</td>
        <td style="padding: 4px 0; vertical-align: top; text-align: right;">${formatNumberTabel(jumlahPengeluaran)}</td>
      </tr>
      <tr style="font-weight: bold;">
        <td style="padding: 4px 0; vertical-align: top;">3. Sisa Dana</td>
        <td style="padding: 4px 0; vertical-align: top;">:</td>
        <td style="padding: 4px 0; vertical-align: top; text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000;">${formatNumberTabel(sisaDana)}</td>
      </tr>
    </tbody>
  </table>

  <p class="sptj-paragraf">
    Demikian surat ini saya buat untuk dapat dipergunakan sebagaimana mestinya dan untuk dapat dipertanggungjawabkan.
  </p>

  <div style="display: flex; justify-content: flex-end; margin-top: 40px;">
    <div style="width: 45%; text-align: left;">
      <div class="ttd-tempat-tgl">${tempatTglStr}</div>
      <div style="margin-top: 5px;">Mengetahui,</div>
      <div class="ttd-jabatan" style="font-weight: bold; margin-top: 2px;">${escapeHtml(jabatan)}</div>
      <div class="ttd-ruang" style="height: 70px;"></div>
      <div class="ttd-nama"><strong>${escapeHtml(namaPejabat)}</strong></div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderSptjHtml };
