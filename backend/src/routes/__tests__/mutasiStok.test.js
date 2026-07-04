const baseUrl = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING MUTASI STOK API INTEGRATION TESTS ===");
  console.log("Test File Path: backend/src/routes/__tests__/mutasiStok.test.js");

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
  if (!loginRes.ok) {
    console.error("Authentication failed:", loginData);
    process.exit(1);
  }
  const token = loginData.token;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
  console.log("Authentication successful.");

  const { PrismaClient } = require("@prisma/client");
  const prismaDb = new PrismaClient();

  let testBahanId = null;
  let testSupplierId = null;
  let testSupplierInaktifId = null;
  const testMutasiIds = [];
  let testValidasiId = null;
  
  try {
    // 2. Setup Data (Bahan Pokok & Supplier)
    const testBahan = await prismaDb.bahanPokok.create({
      data: {
        nama: `Bahan Pokok Mutasi Test ${Date.now()}`,
        satuan: "kg",
        tipePenyimpanan: "HABIS_HARI_ITU",
        aktif: true
      }
    });
    testBahanId = testBahan.id;
    console.log(`Created test BahanPokok ID: ${testBahanId}`);

    const testSupplier = await prismaDb.supplier.create({
      data: {
        nama: `Supplier Mutasi Test ${Date.now()}`,
        kontak: "08123456789",
        aktif: true
      }
    });
    testSupplierId = testSupplier.id;
    console.log(`Created test Supplier ID: ${testSupplierId}`);

    const testSupplierInaktif = await prismaDb.supplier.create({
      data: {
        nama: `Supplier Inaktif Test ${Date.now()}`,
        kontak: "08987654321",
        aktif: false
      }
    });
    testSupplierInaktifId = testSupplierInaktif.id;
    console.log(`Created test Supplier Inaktif ID: ${testSupplierInaktifId}`);

    // 3. Test POST KELUAR dengan supplierId terisi -> 400
    console.log("\n--- Testing POST /mutasi-stok KELUAR (dengan supplierId) ---");
    const keluarSupplierRes = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-05",
        jenis: "KELUAR",
        qty: 10,
        kelompokPenerima: "SISWA",
        supplierId: testSupplierId
      })
    });
    if (keluarSupplierRes.status !== 400) {
      throw new Error(`Expected 400, got ${keluarSupplierRes.status} on KELUAR with supplierId`);
    }
    console.log("POST KELUAR dengan supplierId correctly rejected with 400.");

    // 4. Test POST KELUAR tanpa kelompokPenerima -> 400
    console.log("\n--- Testing POST /mutasi-stok KELUAR (tanpa kelompokPenerima) ---");
    const keluarTanpaPenerimaRes = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-05",
        jenis: "KELUAR",
        qty: 5
      })
    });
    if (keluarTanpaPenerimaRes.status !== 400) {
      throw new Error(`Expected 400, got ${keluarTanpaPenerimaRes.status} on KELUAR without kelompokPenerima`);
    }
    console.log("POST KELUAR tanpa kelompokPenerima correctly rejected with 400.");

    // 5. Test POST KELUAR valid -> kesimpen, supplierId/hargaBeli null
    console.log("\n--- Testing POST /mutasi-stok KELUAR (Valid) ---");
    const keluarValidRes = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-05",
        jenis: "KELUAR",
        qty: 15,
        kelompokPenerima: "SISWA"
      })
    });
    const keluarValidData = await keluarValidRes.json();
    if (keluarValidRes.status !== 201) {
      throw new Error(`Expected 201 on valid KELUAR, got ${keluarValidRes.status}: ${JSON.stringify(keluarValidData)}`);
    }
    if (keluarValidData.kelompokPenerima !== "SISWA" || keluarValidData.supplierId !== null || keluarValidData.hargaBeli !== null) {
      throw new Error(`Data validation failed for valid KELUAR: ${JSON.stringify(keluarValidData)}`);
    }
    testMutasiIds.push(keluarValidData.id);
    console.log("POST KELUAR valid successful.");

    // 6. Test POST MASUK dengan kelompokPenerima terisi -> 400
    console.log("\n--- Testing POST /mutasi-stok MASUK (dengan kelompokPenerima) ---");
    const masukPenerimaRes = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-05",
        jenis: "MASUK",
        qty: 50,
        supplierId: testSupplierId,
        hargaBeli: 20000,
        kelompokPenerima: "SISWA"
      })
    });
    if (masukPenerimaRes.status !== 400) {
      throw new Error(`Expected 400, got ${masukPenerimaRes.status} on MASUK with kelompokPenerima`);
    }
    console.log("POST MASUK dengan kelompokPenerima correctly rejected with 400.");

    // 7. Test POST MASUK dengan supplier inaktif -> 400
    console.log("\n--- Testing POST /mutasi-stok MASUK (dengan supplier inaktif) ---");
    const masukSupplierInaktifRes = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-05",
        jenis: "MASUK",
        qty: 10,
        supplierId: testSupplierInaktifId,
        hargaBeli: 15000
      })
    });
    if (masukSupplierInaktifRes.status !== 400) {
      throw new Error(`Expected 400, got ${masukSupplierInaktifRes.status} on MASUK with inactive supplier`);
    }
    console.log("POST MASUK dengan supplier inaktif correctly rejected with 400.");

    // 8. Test GET /akuntan/validasi-stok/preview (Aggregation MASUK/KELUAR)
    console.log("\n--- Testing GET /akuntan/validasi-stok/preview ---");
    
    // Create multiple mutasi stok
    // Mutasi 1: MASUK 100 kg on 2026-07-01
    const m1Res = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-01",
        jenis: "MASUK",
        qty: 100,
        supplierId: testSupplierId,
        hargaBeli: 20000
      })
    });
    const m1Data = await m1Res.json();
    if (!m1Res.ok) throw new Error(`m1 failed: ${JSON.stringify(m1Data)}`);
    testMutasiIds.push(m1Data.id);

    // Mutasi 2: MASUK 50 kg on 2026-07-02
    const m2Res = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-02",
        jenis: "MASUK",
        qty: 50,
        supplierId: testSupplierId,
        hargaBeli: 21000
      })
    });
    const m2Data = await m2Res.json();
    if (!m2Res.ok) throw new Error(`m2 failed: ${JSON.stringify(m2Data)}`);
    testMutasiIds.push(m2Data.id);

    // Mutasi 3: KELUAR 30 kg on 2026-07-02
    const m3Res = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-02",
        jenis: "KELUAR",
        qty: 30,
        kelompokPenerima: "SISWA"
      })
    });
    const m3Data = await m3Res.json();
    if (!m3Res.ok) throw new Error(`m3 failed: ${JSON.stringify(m3Data)}`);
    testMutasiIds.push(m3Data.id);

    // Mutasi 4: KELUAR 20 kg on 2026-07-03 (This should be excluded from preview on 2026-07-02)
    const m4Res = await fetch(`${baseUrl}/akuntan/mutasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-03",
        jenis: "KELUAR",
        qty: 20,
        kelompokPenerima: "SISWA"
      })
    });
    const m4Data = await m4Res.json();
    if (!m4Res.ok) throw new Error(`m4 failed: ${JSON.stringify(m4Data)}`);
    testMutasiIds.push(m4Data.id);

    // Hit preview on 2026-07-02
    const previewRes = await fetch(`${baseUrl}/akuntan/validasi-stok/preview?bahanPokokId=${testBahanId}&tanggal=2026-07-02`, {
      method: "GET",
      headers
    });
    if (previewRes.status !== 200) {
      throw new Error(`Expected 200 on preview, got ${previewRes.status}`);
    }
    const previewData = await previewRes.json();
    console.log("Preview response data:", previewData);
    
    // Assertions
    if (previewData.qtyDibeli !== 150) {
      throw new Error(`Expected qtyDibeli to be 150, got ${previewData.qtyDibeli}`);
    }
    if (previewData.qtyTerpakai !== 30) {
      throw new Error(`Expected qtyTerpakai to be 30, got ${previewData.qtyTerpakai}`);
    }
    if (previewData.sisaSistem !== 120) {
      throw new Error(`Expected sisaSistem to be 120, got ${previewData.sisaSistem}`);
    }
    console.log("Aggregation preview test passed successfully!");

    // 9. Test POST /akuntan/validasi-stok
    console.log("\n--- Testing POST /akuntan/validasi-stok ---");
    const validasiRes = await fetch(`${baseUrl}/akuntan/validasi-stok`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId,
        tanggal: "2026-07-02",
        qtyDibeli: 150,
        qtyTerpakai: 30,
        catatan: "Validasi stok fisik oke"
      })
    });
    const validasiData = await validasiRes.json();
    if (validasiRes.status !== 201) {
      throw new Error(`Expected 201 on validasi-stok, got ${validasiRes.status}: ${JSON.stringify(validasiData)}`);
    }
    testValidasiId = validasiData.id;
    if (Number(validasiData.selisih) !== 120) {
      throw new Error(`Expected selisih to be calculated server-side as 120, got ${validasiData.selisih}`);
    }
    console.log("POST /akuntan/validasi-stok passed successfully!");

    // 10. Test GET /akuntan/validasi-stok list
    console.log("\n--- Testing GET /akuntan/validasi-stok ---");
    const listRes = await fetch(`${baseUrl}/akuntan/validasi-stok?bahanPokokId=${testBahanId}`, {
      method: "GET",
      headers
    });
    if (listRes.status !== 200) {
      throw new Error(`Expected 200, got ${listRes.status}`);
    }
    const listData = await listRes.json();
    if (listData.data.length !== 1 || listData.data[0].id !== testValidasiId) {
      throw new Error(`List validation failed: ${JSON.stringify(listData)}`);
    }
    console.log("GET /akuntan/validasi-stok passed successfully!");

    // 11. Test GET /akuntan/validasi-stok list filtered by date
    console.log("\n--- Testing GET /akuntan/validasi-stok filtered by date ---");
    const listDateRes = await fetch(`${baseUrl}/akuntan/validasi-stok?bahanPokokId=${testBahanId}&tanggal=2026-07-02`, {
      method: "GET",
      headers
    });
    if (listDateRes.status !== 200) {
      throw new Error(`Expected 200, got ${listDateRes.status}`);
    }
    const listDateData = await listDateRes.json();
    if (listDateData.data.length !== 1 || listDateData.data[0].id !== testValidasiId) {
      throw new Error(`List date validation failed: ${JSON.stringify(listDateData)}`);
    }
    console.log("GET /akuntan/validasi-stok filtered by date passed successfully!");

  } catch (err) {
    console.error("Test execution threw an error:", err);
    throw err;
  } finally {
    // Cleanup
    console.log("\n--- Cleaning up temporary test data ---");
    if (testValidasiId) {
      try {
        await prismaDb.validasiStok.delete({ where: { id: testValidasiId } });
        console.log(`Deleted test ValidasiStok ID: ${testValidasiId}`);
      } catch (e) {
        console.error(`Failed to delete test ValidasiStok ID: ${testValidasiId}`, e);
      }
    }
    for (const mutId of testMutasiIds) {
      try {
        await prismaDb.mutasiStok.delete({ where: { id: mutId } });
        console.log(`Deleted test MutasiStok ID: ${mutId}`);
      } catch (e) {
        console.error(`Failed to delete test MutasiStok ID: ${mutId}`, e);
      }
    }
    if (testBahanId) {
      try {
        await prismaDb.bahanPokok.delete({ where: { id: testBahanId } });
        console.log(`Deleted test BahanPokok ID: ${testBahanId}`);
      } catch (e) {
        console.error(`Failed to delete test BahanPokok ID: ${testBahanId}`, e);
      }
    }
    if (testSupplierId) {
      try {
        await prismaDb.supplier.delete({ where: { id: testSupplierId } });
        console.log(`Deleted test Supplier ID: ${testSupplierId}`);
      } catch (e) {
        console.error(`Failed to delete test Supplier ID: ${testSupplierId}`, e);
      }
    }
    if (testSupplierInaktifId) {
      try {
        await prismaDb.supplier.delete({ where: { id: testSupplierInaktifId } });
        console.log(`Deleted test Inaktif Supplier ID: ${testSupplierInaktifId}`);
      } catch (e) {
        console.error(`Failed to delete test Inaktif Supplier ID: ${testSupplierInaktifId}`, e);
      }
    }
    await prismaDb.$disconnect();
  }
  
  console.log("\nALL MUTASI STOK KONDISIONAL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
