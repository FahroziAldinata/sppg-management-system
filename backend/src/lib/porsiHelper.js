function getTotalPorsiBlok(blok, porsiPerKategori) {
  let total = 0;
  for (const kat of blok.kelompokUmurMenu.kategoriPenerima) {
    total += (porsiPerKategori[kat.id] || 0);
  }
  return total;
}

module.exports = { getTotalPorsiBlok };
