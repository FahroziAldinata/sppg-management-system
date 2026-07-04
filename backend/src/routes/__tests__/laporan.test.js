const assert = require("assert");
const baseUrl = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING LAPORAN API INTEGRATION TESTS WITH STRICT VALUE ASSERTIONS ===");
  console.log("Test File Path: backend/src/routes/__tests__/laporan.test.js");

  // 1. Authenticate as AKUNTAN
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "akuntan",
      password: "ganti-password-ini"
    })
  });

  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, "Authentication response status must be 200");
  const token = loginData.token;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
  console.log("Authentication successful.");

  const { PrismaClient } = require("@prisma/client");
  const prismaDb = new PrismaClient();

  // Find existing Master Data to avoid creating complex structures
  const periode = await prismaDb.periode.findFirst({
    orderBy: { tanggalMulai: "desc" }
  });
  assert.ok(periode, "Must have an existing active Periode in DB");

  const akunKas = await prismaDb.akun.findFirst({
    where: { tipe: "KAS" }
  });
  const akunBiaya = await prismaDb.akun.findFirst({
    where: { tipe: "BIAYA" }
  });
  assert.ok(akunKas && akunBiaya, "Must have KAS and BIAYA Accounts in DB");

  const kelompokUmur = await prismaDb.kelompokUmurMenu.findFirst({
    include: { kategoriPenerima: true }
  });
  assert.ok(kelompokUmur && kelompokUmur.kategoriPenerima.length > 0, "Must have KelompokUmurMenu linked to KategoriPenerima");
  const kategori = kelompokUmur.kategoriPenerima[0];

  // Temporary record IDs for cleanup
  let testBahanId = null;
  let testJurnalId = null;
  let testAnggaranId = null;
  let testDetailId = null;
  let testMenuHarianId = null;
  let testMenuHarianBlokId = null;
  let testMenuItemId = null;
  let testMenuItemBahanId = null;
  let testInputPmId = null;
  let testInputPmDetailId = null;
  let testSaldoAwalBarangId = null;
  const testMutasiIds = [];

  try {
    // 2. Setup Temporary Bahan Pokok
    console.log("Creating temporary BahanPokok...");
    const testBahan = await prismaDb.bahanPokok.create({
      data: {
        nama: "Bahan Pokok Test Laporan " + Date.now(),
        satuan: "KG",
        aktif: true
      }
    });
    testBahanId = testBahan.id;

    // 3. Setup Temporary Jurnal and Anggaran records (for BKU, BP, LPA, SPTJ, BAPSD)
    console.log("Creating temporary Jurnal and Anggaran records...");
    const testJurnal = await prismaDb.jurnalTransaksi.create({
      data: {
        periodeId: periode.id,
        tanggal: new Date(Date.UTC(2026, 6, 2)), // 2026-07-02
        nomorBukti: 99999,
        uraian: "Test Jurnal Laporan",
        jenis: "KELUAR",
        nominal: 150000,
        akunKasId: akunKas.id,
        akunDanaBiayaId: akunBiaya.id,
        createdById: loginData.user.id
      }
    });
    testJurnalId = testJurnal.id;

    const testAnggaran = await prismaDb.anggaranHarian.create({
      data: {
        periodeId: periode.id,
        tanggal: new Date(Date.UTC(2026, 6, 2)),
        kategoriDana: "BAHAN_MAKANAN",
        jumlahPaket: 100,
        rab: 1000000,
        aktual: 150000,
        selisih: 850000
      }
    });
    testAnggaranId = testAnggaran.id;

    const testDetail = await prismaDb.anggaranBahanMakananDetail.create({
      data: {
        anggaranHarianId: testAnggaran.id,
        kategoriId: kategori.id,
        jumlahPaket: 100,
        hargaSatuan: 10000,
        subtotal: 1000000
      }
    });
    testDetailId = testDetail.id;

    // 4. Setup KBB Temporary Data: Menu Harian, Blok, Item, Bahan, and InputPenerimaManfaat
    // We use Date.UTC(2026, 6, 2) which is a Thursday (KAMIS)
    const testMenuHarian = await prismaDb.menuHarian.create({
      data: {
        periodeId: periode.id,
        tanggal: new Date(Date.UTC(2026, 6, 2)),
        status: "DISETUJUI"
      }
    });
    testMenuHarianId = testMenuHarian.id;

    const testMenuHarianBlok = await prismaDb.menuHarianBlok.create({
      data: {
        menuHarianId: testMenuHarian.id,
        kelompokUmurMenuId: kelompokUmur.id,
        createdById: loginData.user.id
      }
    });
    testMenuHarianBlokId = testMenuHarianBlok.id;

    const testMenuItem = await prismaDb.menuItem.create({
      data: {
        blokId: testMenuHarianBlok.id,
        namaMenu: "Menu Item Test Laporan",
        komponen: "LAUK_HEWANI"
      }
    });
    testMenuItemId = testMenuItem.id;

    const testMenuItemBahan = await prismaDb.menuItemBahan.create({
      data: {
        menuItemId: testMenuItem.id,
        bahanPokokId: testBahan.id,
        beratBersihGr: 40.00,
        bddPersen: 80.00,
        beratKotorGr: 50.00, // Formula: 40 / 0.8 = 50
        hargaSatuan: 20000.00,
        beratSatuanGr: 1000.00,
        totalHargaBahan: 1000.00, // Formula: 50 * 20000 / 1000 = 1000
        energiKkal: 100.00,
        proteinGr: 10.00,
        lemakGr: 5.00,
        karbohidratGr: 2.00,
        seratGr: 0.00
      }
    });
    testMenuItemBahanId = testMenuItemBahan.id;

    const testInputPm = await prismaDb.inputPenerimaManfaat.create({
      data: {
        periodeId: periode.id,
        hariAktif: ["KAMIS"], // Thursday matches 2026-07-02
        createdById: loginData.user.id
      }
    });
    testInputPmId = testInputPm.id;

    const testInputPmDetail = await prismaDb.inputPenerimaManfaatDetail.create({
      data: {
        inputPenerimaManfaatId: testInputPm.id,
        kategoriId: kategori.id,
        lakiLaki: 10,
        perempuan: 15
      }
    });
    testInputPmDetailId = testInputPmDetail.id;

    // 5. Setup Stock Barang Temporary Data: SaldoAwalBarang and MutasiStok
    const testSaldoAwalBarang = await prismaDb.saldoAwalBarang.create({
      data: {
        periodeId: periode.id,
        bahanPokokId: testBahan.id,
        saldoAwalQty: 10.000,
        hargaBeliAwal: 10000.00
      }
    });
    testSaldoAwalBarangId = testSaldoAwalBarang.id;

    // Mutasi 1: MASUK, tanggal 2026-07-01, qty 5, hargaBeli 12000
    const m1 = await prismaDb.mutasiStok.create({
      data: {
        bahanPokokId: testBahan.id,
        tanggal: new Date(Date.UTC(2026, 6, 1)),
        jenis: "MASUK",
        qty: 5.000,
        hargaBeli: 12000.00,
        keterangan: "Mutasi Masuk 1",
        createdById: loginData.user.id
      }
    });
    testMutasiIds.push(m1.id);

    // Mutasi 2: MASUK, tanggal 2026-07-03, qty 2, hargaBeli 15000 (Newer price!)
    const m2 = await prismaDb.mutasiStok.create({
      data: {
        bahanPokokId: testBahan.id,
        tanggal: new Date(Date.UTC(2026, 6, 3)),
        jenis: "MASUK",
        qty: 2.000,
        hargaBeli: 15000.00,
        keterangan: "Mutasi Masuk 2",
        createdById: loginData.user.id
      }
    });
    testMutasiIds.push(m2.id);

    // Mutasi 3: KELUAR, tanggal 2026-07-04, qty 4
    const m3 = await prismaDb.mutasiStok.create({
      data: {
        bahanPokokId: testBahan.id,
        tanggal: new Date(Date.UTC(2026, 6, 4)),
        jenis: "KELUAR",
        qty: 4.000,
        keterangan: "Mutasi Keluar 1",
        createdById: loginData.user.id
      }
    });
    testMutasiIds.push(m3.id);

    // 6. Test BKU
    console.log("\n--- Testing GET /laporan/bku ---");
    const bkuRes = await fetch(`${baseUrl}/laporan/bku?periodeId=${periode.id}`, { headers });
    assert.strictEqual(bkuRes.status, 200, "BKU response status must be 200");
    const bkuData = await bkuRes.json();
    assert.strictEqual(bkuData.success, true, "BKU response success must be true");
    assert.ok(Array.isArray(bkuData.data), "BKU data must be an array");
    const testBkuRow = bkuData.data.find(row => row.id === testJurnalId);
    assert.ok(testBkuRow, "BKU must include our temporary test Jurnal record");
    assert.strictEqual(testBkuRow.noBukti, 99999, "BKU test row number must be 99999");
    assert.strictEqual(testBkuRow.kredit, 150000, "BKU test row credit must match nominal");
    console.log("BKU passed assertions.");

    // 7. Test BP
    console.log("\n--- Testing GET /laporan/bp ---");
    const bpRes = await fetch(`${baseUrl}/laporan/bp?periodeId=${periode.id}&akunId=${akunKas.id}`, { headers });
    assert.strictEqual(bpRes.status, 200, "BP response status must be 200");
    const bpData = await bpRes.json();
    assert.strictEqual(bpData.success, true, "BP response success must be true");
    assert.ok(Array.isArray(bpData.data), "BP data must be an array");
    const testBpRow = bpData.data.find(row => row.id === testJurnalId);
    assert.ok(testBpRow, "BP must include our temporary test Jurnal record");
    assert.strictEqual(testBpRow.debet, 0, "BP test row debet must be 0 for credit-only side on Kas");
    assert.strictEqual(testBpRow.kredit, 150000, "BP test row kredit must be 150000");
    console.log("BP passed assertions.");

    // 8. Test LPA
    console.log("\n--- Testing GET /laporan/lpa ---");
    const lpaRes = await fetch(`${baseUrl}/laporan/lpa?periodeId=${periode.id}&nomorDokumen=01/LPA/TEST`, { headers });
    assert.strictEqual(lpaRes.status, 200, "LPA response status must be 200");
    const lpaData = await lpaRes.json();
    assert.strictEqual(lpaData.success, true);
    assert.strictEqual(lpaData.data.nomorDokumen, "01/LPA/TEST", "LPA nomorDokumen must match request");
    assert.ok(Array.isArray(lpaData.data.rincian), "LPA rincian must be an array");
    const r = lpaData.data.rincian.find(x => x.kategoriDana === "BAHAN_MAKANAN");
    assert.ok(r, "LPA must contain BAHAN_MAKANAN category");
    assert.ok(r.diajukan >= 1000000, "LPA BAHAN_MAKANAN diajukan must include our test record");
    assert.ok(r.terealisasi >= 150000, "LPA BAHAN_MAKANAN terealisasi must include our test record");
    console.log("LPA passed assertions.");

    // 9. Test SPTJ
    console.log("\n--- Testing GET /laporan/sptj ---");
    const sptjRes = await fetch(`${baseUrl}/laporan/sptj?periodeId=${periode.id}`, { headers });
    assert.strictEqual(sptjRes.status, 200, "SPTJ response status must be 200");
    const sptjData = await sptjRes.json();
    assert.strictEqual(sptjData.success, true);
    assert.ok(sptjData.data.jumlahPenerimaan >= 1000000, "SPTJ Penerimaan must include our test record");
    assert.ok(sptjData.data.jumlahPengeluaran >= 150000, "SPTJ Pengeluaran must include our test record");
    console.log("SPTJ passed assertions.");

    // 10. Test BAPSD
    console.log("\n--- Testing GET /laporan/bapsd ---");
    const bapsdRes = await fetch(`${baseUrl}/laporan/bapsd?periodeId=${periode.id}&nomorDokumen=01/BAPSD/TEST`, { headers });
    assert.strictEqual(bapsdRes.status, 200, "BAPSD response status must be 200");
    const bapsdData = await bapsdRes.json();
    assert.strictEqual(bapsdData.success, true);
    assert.strictEqual(bapsdData.data.nomorDokumen, "01/BAPSD/TEST");
    assert.ok(bapsdData.data.sisaDana !== undefined, "BAPSD must return sisaDana");
    console.log("BAPSD passed assertions.");

    // 11. Test KBB (Kebutuhan Belanja Bahan) - Strict Value Assertion
    console.log("\n--- Testing GET /laporan/kebutuhan-belanja-bahan ---");
    const kbbRes = await fetch(`${baseUrl}/laporan/kebutuhan-belanja-bahan?periodeId=${periode.id}&tanggalMulai=2026-07-01&tanggalSelesai=2026-07-07`, { headers });
    assert.strictEqual(kbbRes.status, 200, "KBB response status must be 200");
    const kbbData = await kbbRes.json();
    assert.strictEqual(kbbData.success, true);
    assert.ok(Array.isArray(kbbData.data), "KBB data must be an array");
    
    const testKbbRow = kbbData.data.find(row => row.id === testBahan.id);
    assert.ok(testKbbRow, "KBB must include our test BahanPokok record");
    // Expected: total porsi = 10 (laki-laki) + 15 (perempuan) = 25
    // beratKotorGr per portion = 50.00g -> totalBeratKotorGr = 50 * 25 = 1250g
    // totalHargaBahan per portion = 1000.00 -> totalEstimasiBiaya = 1000 * 25 = 25000
    assert.strictEqual(testKbbRow.totalBeratKotorGr, 1250, "KBB totalBeratKotorGr calculation must match expected");
    assert.strictEqual(testKbbRow.totalBeratBersihGr, 1000, "KBB totalBeratBersihGr calculation must match expected (40 * 25 = 1000)");
    assert.strictEqual(testKbbRow.totalEstimasiBiaya, 25000, "KBB totalEstimasiBiaya calculation must match expected");
    console.log("KBB passed STRICT VALUE assertions.");

    // 12. Test Laporan Per Periode
    console.log("\n--- Testing GET /laporan/per-periode ---");
    const lppRes = await fetch(`${baseUrl}/laporan/per-periode?periodeId=${periode.id}`, { headers });
    assert.strictEqual(lppRes.status, 200, "LPP response status must be 200");
    const lppData = await lppRes.json();
    assert.strictEqual(lppData.success, true);
    assert.strictEqual(lppData.data.bahanMakanan.pendidikan.metodeAlokasi, "PROPORSIONAL_RAB", "Pendidikan metodeAlokasi flag must be PROPORSIONAL_RAB");
    assert.strictEqual(lppData.data.bahanMakanan.posyandu.metodeAlokasi, "PROPORSIONAL_RAB", "Posyandu metodeAlokasi flag must be PROPORSIONAL_RAB");
    console.log("Laporan Per Periode passed assertions.");

    // 13. Test Laporan Per Bulan
    console.log("\n--- Testing GET /laporan/per-bulan ---");
    const lpbRes = await fetch(`${baseUrl}/laporan/per-bulan?periodeId=${periode.id}`, { headers });
    assert.strictEqual(lpbRes.status, 200, "LPB response status must be 200");
    const lpbData = await lpbRes.json();
    assert.strictEqual(lpbData.success, true);
    assert.ok(Array.isArray(lpbData.data), "LPB data must be an array");
    const testMonthRow = lpbData.data.find(row => row.key === "2026-07");
    assert.ok(testMonthRow, "LPB must contain data for July 2026");
    assert.ok(testMonthRow.totalKeluar >= 150000, "LPB July 2026 totalKeluar must include our test record");
    console.log("Laporan Per Bulan passed assertions.");

    // 14. Test Stock Barang - Strict Value Assertion
    console.log("\n--- Testing GET /laporan/stock-barang ---");
    const sbRes = await fetch(`${baseUrl}/laporan/stock-barang?periodeId=${periode.id}&tanggal=2026-07-05`, { headers });
    assert.strictEqual(sbRes.status, 200, "SB response status must be 200");
    const sbData = await sbRes.json();
    assert.strictEqual(sbData.success, true);
    assert.ok(Array.isArray(sbData.data), "SB data must be an array");
    
    const testSbRow = sbData.data.find(row => row.bahanPokokId === testBahan.id);
    assert.ok(testSbRow, "SB must include our test BahanPokok record");
    // Expected Qty: Saldo Awal (10) + MASUK (5 + 2) - KELUAR (4) = 13
    // Expected Price: Newest MASUK <= cutoff date (15000)
    // Expected Nilai Stock: 13 * 15000 = 195000
    assert.strictEqual(testSbRow.saldoAwalQty, 10, "SB saldoAwalQty must match expected");
    assert.strictEqual(testSbRow.totalMasukQty, 7, "SB totalMasukQty must match expected (5 + 2 = 7)");
    assert.strictEqual(testSbRow.totalKeluarQty, 4, "SB totalKeluarQty must match expected");
    assert.strictEqual(testSbRow.saldoAkhirQty, 13, "SB saldoAkhirQty must match expected");
    assert.strictEqual(testSbRow.hargaBeliTerakhir, 15000, "SB hargaBeliTerakhir must match newest MASUK price (15000)");
    assert.strictEqual(testSbRow.nilaiStock, 195000, "SB nilaiStock must match expected (13 * 15000 = 195000)");
    console.log("Stock Barang passed STRICT VALUE assertions.");

    console.log("\nALL LAPORAN API TESTS PASSED SUCCESSFULLY WITH STRICT VALUE ASSERTIONS!");

  } catch (err) {
    console.error("Test execution threw an assertion error:", err);
    throw err;
  } finally {
    console.log("\n--- Cleaning up temporary test data ---");
    // Delete in reverse order of dependencies
    for (const mId of testMutasiIds) {
      try { await prismaDb.mutasiStok.delete({ where: { id: mId } }); } catch (e) {}
    }
    if (testSaldoAwalBarangId) {
      try { await prismaDb.saldoAwalBarang.delete({ where: { id: testSaldoAwalBarangId } }); } catch (e) {}
    }
    if (testInputPmDetailId) {
      try { await prismaDb.inputPenerimaManfaatDetail.delete({ where: { id: testInputPmDetailId } }); } catch (e) {}
    }
    if (testInputPmId) {
      try { await prismaDb.inputPenerimaManfaat.delete({ where: { id: testInputPmId } }); } catch (e) {}
    }
    if (testMenuItemBahanId) {
      try { await prismaDb.menuItemBahan.delete({ where: { id: testMenuItemBahanId } }); } catch (e) {}
    }
    if (testMenuItemId) {
      try { await prismaDb.menuItem.delete({ where: { id: testMenuItemId } }); } catch (e) {}
    }
    if (testMenuHarianBlokId) {
      try { await prismaDb.menuHarianBlok.delete({ where: { id: testMenuHarianBlokId } }); } catch (e) {}
    }
    if (testMenuHarianId) {
      try { await prismaDb.menuHarian.delete({ where: { id: testMenuHarianId } }); } catch (e) {}
    }
    if (testDetailId) {
      try { await prismaDb.anggaranBahanMakananDetail.delete({ where: { id: testDetailId } }); } catch (e) {}
    }
    if (testAnggaranId) {
      try { await prismaDb.anggaranHarian.delete({ where: { id: testAnggaranId } }); } catch (e) {}
    }
    if (testJurnalId) {
      try { await prismaDb.jurnalTransaksi.delete({ where: { id: testJurnalId } }); } catch (e) {}
    }
    if (testBahanId) {
      try { await prismaDb.bahanPokok.delete({ where: { id: testBahanId } }); } catch (e) {}
    }
  }
}

runTests().catch(() => process.exit(1));
