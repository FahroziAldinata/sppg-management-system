## Code-splitting bundle size (belum urgent)

- Vite build warning: ada chunk >500kB minified (pre-existing sejak awal,
  bukan dari cleanup unused-files 2026-07-15).
- Fix: `React.lazy` per halaman role (Aslap/Mitra/Gizi/Akuntan/Kepala) atau
  `manualChunks` di `vite.config.js`.
- Prioritas: rendah. Kerjakan kalau ada bukti nyata loading lambat di
  lapangan (terutama Aslap pakai koneksi HP), bukan preventif.
- Scope: refactor import/routing, BUKAN bagian audit file gak kepake.
