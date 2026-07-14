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
  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok">Berita Acara Pengalihan Sisa Dana</h2>
  <div class="nomor-dok">Nomor: <span class="highlight">${escapeHtml(nomorDokumen)}</span></div>
  <div class="periode-label">Periode: ${escapeHtml(periodeLabel)}</div>

  <p class="bapsd-pembuka">
    Pada hari ini, bertempat di ${escapeHtml(tempatPelaporan || 'Satuan Pelayanan')}, sehubungan dengan telah selesainya pelaksanaan program pelayanan gizi periode ${escapeHtml(periodeLabel)}, kami yang bertanda tangan di bawah ini menyatakan sepakat melakukan pengalihan sisa dana dengan ketentuan sebagai berikut:
  </p>

  <div class="bapsd-poin">
    1. Bahwa sisa dana yang belum terealisasi pada periode ini adalah sebesar <strong>${formatRupiah(sisaDana)}</strong>.<br>
    2. Sisa dana tersebut dialihkan seluruhnya untuk digunakan pada pelaksanaan program gizi periode berikutnya yang akan dimulai pada tanggal <strong>${escapeHtml(tglBerikutnyaStr)}</strong>.<br>
    3. Penggunaan dana yang dialihkan tersebut tetap wajib dipertanggungjawabkan sesuai ketentuan pedoman keuangan yang berlaku.
  </div>

  <p class="bapsd-pembuka">
    Demikian Berita Acara Pengalihan Sisa Dana ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
  </p>

  ${footerTTD}
</body>
</html>`;
}

module.exports = { renderBapsdHtml };
