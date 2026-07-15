/**
 * HTML template untuk BAPSD (Berita Acara Pengalihan Sisa Dana).
 * Field mapping 1:1 ke output generateBAPSD:
 *   nomorDokumen, periodeLabel, sisaDana, tanggalMulaiBerikutnya,
 *   namaYayasan, ketuaYayasan, namaAkuntan, namaPejabat,
 *   tempatPelaporan, tanggalPelaporan, namaLembaga
 */
const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

/**
 * @param {object} data - data untuk BAPSD
 * @returns {string} HTML string
 */
function renderBapsdHtml(data) {
  const {
    nomorDokumen,
    periodeLabel,
    sisaDana,
    tanggalMulaiBerikutnya,
    namaYayasan,
    ketuaYayasan,
    namaAkuntan,
    namaPejabat,
    tempatPelaporan,
    tanggalPelaporan,
    namaLembaga,
    alamat
  } = data;

  const tglPelaporanStr = tanggalPelaporan
    ? new Date(tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_______________';
  const tempatTglStr = `${escapeHtml(tempatPelaporan || '')}, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${tglPelaporanStr}`;

  const tglBerikutnyaStr = tanggalMulaiBerikutnya
    ? new Date(tanggalMulaiBerikutnya).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_______________';

  // Footer TTD: 2 kolom (Pihak Pertama kiri, Pihak Kedua kanan) + Mengetahui Kepala SPPG terpisah di bawah
  // SAMA PERSIS dengan LPA sesuai instruksi user
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
  <title>BAPSD — ${escapeHtml(nomorDokumen)}</title>
  <style>
    ${SHARED_CSS}
    /* BAPSD-specific styling */
    .bapsd-pembuka { margin: 20px 0 15px 0; line-height: 1.6; text-align: justify; }
    .bapsd-poin { margin-left: 20px; margin-bottom: 15px; line-height: 1.6; }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat, tampilkanBarisYayasan: false })}

  <h2 class="judul-dok" style="margin-top: 20px;">Berita Acara Pengalihan Sisa Dana</h2>
  <div class="nomor-dok">Nomor: <span class="highlight">${escapeHtml(nomorDokumen)}</span></div>

  <p class="bapsd-pembuka">
    Sehubungan dengan telah berakhirnya periode ${escapeHtml(periodeLabel)}, sisa dana sebesar Rp${sisaDana},- akan dialihkan ke periode selanjutnya yang dimulai pada ${escapeHtml(tglBerikutnyaStr)}. Pengalihan sisa dana ini bertujuan untuk mendukung kegiatan yang direncanakan pada periode berikutnya.
  </p>

  ${footerTTD}
</body>
</html>`;
}

module.exports = { renderBapsdHtml };
