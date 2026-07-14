/**
 * HTML template untuk SPTJ (Surat Pernyataan Tanggung Jawab).
 * Field mapping 1:1 ke output generateSPTJ:
 *   namaPejabat, jabatan, jumlahPenerimaan, jumlahPengeluaran, sisaDana,
 *   tempatPelaporan, tanggalPelaporan, tahunAnggaran, namaLembaga
 */
const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

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

  // Footer TTD: Hanya 1 kolom di sebelah kanan
  // renderFooterTTD akan me-render 1 kolom di kanan jika count === 1
  const footerTTD = renderFooterTTD([
    { label: '', jabatan: jabatan || 'Kepala SPPG', nama: namaPejabat || '' }
  ], tempatTglStr);

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
    .sptj-tabel-ringkasan { margin: 20px auto; width: 80%; border-collapse: collapse; }
    .sptj-tabel-ringkasan td { border: 1px solid #555; padding: 8px 12px; font-size: 11pt; }
    .sptj-tabel-ringkasan tr.bold-row { font-weight: bold; background-color: #f5f5f5; }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok">Surat Pernyataan Tanggung Jawab</h2>
  <p style="text-align: center; margin: 0 0 25px 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">
    SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
  </p>

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
      <tr>
        <td>Lembaga</td>
        <td>: ${escapeHtml(namaLembaga)}</td>
      </tr>
    </tbody>
  </table>

  <p class="sptj-paragraf">
    Menyatakan bertanggung jawab penuh atas penggunaan dana pelayanan gizi APBN TA ${escapeHtml(tahunAnggaran || '2026')} melalui DIPA Badan Gizi Nasional TA ${escapeHtml(tahunAnggaran || '2026')} pada periode ini dengan rincian penerimaan dan pengeluaran sebagai berikut:
  </p>

  <table class="sptj-tabel-ringkasan">
    <tbody>
      <tr>
        <td><strong>Jumlah Penerimaan</strong></td>
        <td style="text-align:right;">${formatRupiah(jumlahPenerimaan)}</td>
      </tr>
      <tr>
        <td><strong>Jumlah Pengeluaran (Realisasi)</strong></td>
        <td style="text-align:right; color: #d32f2f;">${formatRupiah(jumlahPengeluaran)}</td>
      </tr>
      <tr class="bold-row">
        <td><strong>Sisa Dana / Selisih</strong></td>
        <td style="text-align:right;">${formatRupiah(sisaDana)}</td>
      </tr>
    </tbody>
  </table>

  <p class="sptj-paragraf">
    Demikian surat pernyataan pertanggungjawaban ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
  </p>

  <div style="display: flex; justify-content: flex-end; margin-top: 40px;">
    <div style="width: 45%; text-align: center;">
      <div class="ttd-tempat-tgl">${escapeHtml(tempatTglStr)}</div>
      <div class="ttd-jabatan" style="font-weight: bold; margin-top: 5px;">${escapeHtml(jabatan)}</div>
      <div class="ttd-ruang" style="height: 70px;"></div>
      <div class="ttd-nama"><strong>${escapeHtml(namaPejabat)}</strong></div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderSptjHtml };
