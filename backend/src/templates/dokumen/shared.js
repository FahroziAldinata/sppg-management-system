const fs = require('fs');
const path = require('path');

/**
 * Shared HTML template fragments for PDF dokumen resmi SPPG.
 * Dipakai ulang oleh LPA, SPTJ, BAPSD, BKU, Nominatif Upah.
 */

/**
 * Render kop surat resmi SPPG.
 * @param {object} opts
 * @param {string} opts.namaLembaga  - nama SPPG, contoh: "SPPG Tunas Harapan"
 * @param {string} opts.alamat       - alamat lengkap (opsional)
 * @param {string} opts.logoFileName - nama file logo (opsional, default 'logo-bgn.png')
 * @param {boolean} opts.tampilkanBarisYayasan - tampilkan nama yayasan (opsional, default true)
 */
function renderKopSurat({ namaLembaga = '', alamat = '', logoFileName = 'logo-bgn.png', tampilkanBarisYayasan = true } = {}) {
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, `../../../assets/dokumen-resmi/${logoFileName}`);
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString('base64');
    }
  } catch (e) {
    console.error('Gagal memuat logo untuk kop surat:', e);
  }

  const logoSrc = logoBase64 
    ? `data:image/png;base64,${logoBase64}`
    : `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56">
        <circle cx="32" cy="32" r="30" fill="#1a3c6e" stroke="#fff" stroke-width="2"/>
        <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="18" font-family="serif" font-weight="bold">BGN</text>
      </svg>
    `)}`;

  const isPalabuan = (namaLembaga || '').toUpperCase().includes('PALABUAN');
  const namaResmiKop = isPalabuan
    ? 'SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) SUMEDANG UJUNGJAYA PALABUAN'
    : namaLembaga;

  return `
    <div class="kop-surat">
      <div class="kop-logo">
        <img src="${logoSrc}" alt="Logo BGN" width="56" height="56" style="display: block; width: 56px; height: 56px; object-fit: contain;" />
      </div>
      <div class="kop-text">
        <div class="kop-lembaga" style="font-size: 11pt; font-weight: bold; text-transform: uppercase; line-height: 1.3;">
          ${escapeHtml(namaResmiKop)}
          ${isPalabuan && tampilkanBarisYayasan ? `<br><span style="font-size: 9.5pt; font-weight: normal;">(YAYASAN TIGA SRIKANDI BERLIAN SUMEDANG)</span>` : ''}
        </div>
        ${alamat ? `<div class="kop-alamat" style="font-size: 9.5pt; margin-top: 3px; font-weight: normal; line-height: 1.3;">Alamat : ${escapeHtml(alamat)}</div>` : ''}
      </div>
    </div>
    <div class="kop-garis"></div>
  `;
}

/**
 * Render footer tanda tangan.
 * @param {Array<{label: string, nama: string, jabatan?: string}>} kolom - maks 3 kolom
 * @param {string} [tempatTanggal]   - "Jakarta, 14 Juli 2026"
 * @param {object} [opts]
 * @param {string} [opts.tengahLabel]  - label kolom tengah (kalau 3 kolom, biasanya "Mengetahui")
 */
function renderFooterTTD(kolom = [], tempatTanggal = '', opts = {}) {
  const count = kolom.length;
  if (count === 1) {
    const k = kolom[0];
    return `
      <div class="footer-ttd" style="display:flex; justify-content:center; margin-top:30px;">
        <div class="ttd-kolom" style="width:45%; text-align:left;">
          ${k.label ? `<div class="ttd-label" style="font-weight: normal; margin-bottom: 2px;">${escapeHtml(k.label)}</div>` : ''}
          ${k.org ? `<div class="ttd-org" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.org)}</div>` : ''}
          ${k.jabatan ? `<div class="ttd-jabatan" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.jabatan)}</div>` : ''}
          <div class="ttd-ruang"></div>
          <div class="ttd-nama" style="font-size: 11pt;"><strong>${escapeHtml(k.nama)}</strong></div>
          ${k.jabatanBawah ? `<div class="ttd-jabatan-bawah" style="font-size: 11pt; margin-top: 2px;">${escapeHtml(k.jabatanBawah)}</div>` : ''}
        </div>
      </div>
    `;
  }

  const cols = kolom.map((k, i) => {
    const dateHtml = (i === 1 && tempatTanggal)
      ? `<div class="ttd-tempat-tgl" style="margin-bottom: 2px;">${tempatTanggal}</div>`
      : `<div class="ttd-tempat-tgl-placeholder" style="height: 19px; margin-bottom: 2px;"></div>`;

    return `
      <div class="ttd-kolom" style="width:45%; text-align:left;">
        ${dateHtml}
        ${k.label ? `<div class="ttd-label" style="font-weight: normal; margin-bottom: 2px;">${escapeHtml(k.label)}</div>` : ''}
        ${k.org ? `<div class="ttd-org" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.org)}</div>` : ''}
        ${k.jabatan ? `<div class="ttd-jabatan" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.jabatan)}</div>` : ''}
        <div class="ttd-ruang"></div>
        <div class="ttd-nama" style="font-size: 11pt;"><strong>${escapeHtml(k.nama)}</strong></div>
        ${k.jabatanBawah ? `<div class="ttd-jabatan-bawah" style="font-size: 11pt; margin-top: 2px;">${escapeHtml(k.jabatanBawah)}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="footer-ttd" style="display:flex; justify-content:space-between; gap:16px; margin-top:30px;">
      ${cols}
    </div>
  `;
}

/**
 * Escape HTML chars agar nama/alamat tidak bisa XSS di template.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format angka ke rupiah Indonesia.
 * @param {number} val
 */
function formatRupiah(val) {
  return 'Rp' + Number(val || 0).toLocaleString('id-ID');
}

/**
 * Format angka untuk kolom tabel tanpa awalan Rp dan return '-' untuk nilai 0.
 * @param {number} val
 */
function formatNumberTabel(val) {
  if (val === 0 || !val) return '-';
  return Number(val).toLocaleString('id-ID');
}

/**
 * Shared <style> block untuk semua dokumen resmi (injected ke <head>).
 */
const SHARED_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #000;
    margin: 0;
    padding: 15mm;
    background: #fff;
    min-height: calc(297mm - 60mm);
  }
  .kop-surat {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 4px;
  }
  .kop-logo-placeholder {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .kop-text { flex: 1; text-align: center; }
  .kop-instansi { font-size: 11pt; font-weight: normal; letter-spacing: 0.03em; }
  .kop-lembaga { font-size: 16pt; font-weight: bold; text-transform: uppercase; }
  .kop-alamat { font-size: 10pt; margin-top: 2px; }
  .kop-garis { border-top: 3px solid #000; margin-bottom: 2px; }
  .kop-garis-tipis { border-top: 1px solid #000; margin-bottom: 8px; }

  h2.judul-dok { text-align: center; font-size: 13pt; font-weight: bold; margin: 8px 0 2px 0; text-transform: uppercase; }
  .nomor-dok { text-align: center; font-size: 11pt; margin-bottom: 2px; }
  .nomor-dok span.highlight { background: #ffe000; padding: 0 6px; font-weight: bold; }
  .periode-label { text-align: center; font-size: 11pt; margin-bottom: 8px; }

  table { border-collapse: collapse; width: 100%; margin-bottom: 0; }
  table.tabel-rincian th {
    padding: 5px 6px;
    font-size: 11pt;
    font-weight: bold;
  }
  table.tabel-rincian th.col-label {
    text-align: left;
  }
  table.tabel-rincian th.col-amount {
    text-align: right;
  }
  table.tabel-rincian td {
    padding: 4px 6px;
    font-size: 11pt;
    line-height: 1.1;
  }
  table.tabel-rincian td.col-label {
    text-align: left;
  }
  table.tabel-rincian td.col-amount {
    text-align: right;
  }
  table.tabel-rincian tr.baris-total td {
    font-weight: bold;
  }
  table.tabel-rincian tr.baris-total td.col-total-amount {
    border-top: 1.5px solid #000;
    border-bottom: 1.5px solid #000;
  }
  table.identitas-lembaga td { padding: 2px 6px; font-size: 11pt; vertical-align: top; }
  table.identitas-lembaga td:first-child { width: 200px; }

  .keterangan-section { margin-top: 10px; font-size: 11pt; line-height: 1.5; }
  .keterangan-section p { margin: 3px 0; }

  .footer-ttd { margin-top: 20px; page-break-inside: avoid; }
  .ttd-kolom { display: inline-block; text-align: center; }
  .ttd-label { font-weight: bold; font-size: 11pt; margin-bottom: 2px; }
  .ttd-tempat-tgl { font-size: 11pt; }
  .ttd-jabatan { font-size: 11pt; margin-top: 2px; }
  .ttd-ruang { height: 48px; }
  .ttd-nama { font-size: 11pt; }

  .section-title { font-weight: bold; text-decoration: underline; margin: 10px 0 4px 0; font-size: 11pt; }
  .pembuka { font-size: 11pt; line-height: 1.6; margin-bottom: 8px; }
`;

module.exports = { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS };
