const baseUrl = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING GIZI COMPLETE INTEGRATION TESTS ===");
  console.log("Test File Path: backend/src/routes/__tests__/gizi_temp.js");

  // 1. Authenticate
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "ahligizi",
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

  const periodeId = "periode-contoh-8-17-jan-2026";
  let testMenuHarianId = null;
  let testKendaraanId = null;
  let testInactiveKendaraanId = null;
  let testPengirimanId = null;
  let testBlockId = null;
  let testApprovalId = null;

  try {
    // Get seeded groups/users for relations
    const kelompokUmur = await prismaDb.kelompokUmurMenu.findMany();
    if (kelompokUmur.length === 0) throw new Error("No kelompokUmurMenu seeded");
    const koId = kelompokUmur[0].id;

    const userAhliGizi = await prismaDb.user.findFirst({ where: { username: "ahligizi" } });
    const userKepala = await prismaDb.user.findFirst({ where: { username: "kepalasppg" } });

    // =========================================================================
    // SECTION 1: Kendaraan CRUD tests
    // =========================================================================
    console.log("\n--- Testing POST /api/gizi/kendaraan (Active) ---");
    const carRes = await fetch(`${baseUrl}/gizi/kendaraan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        namaKendaraan: "Toyota Hilux SPPG 01",
        platNomor: "B 1234 SPG",
        aktif: true
      })
    });
    const carData = await carRes.json();
    if (carRes.status !== 201) throw new Error(`Expected 201, got ${carRes.status}`);
    testKendaraanId = carData.id;
    console.log("POST Active Kendaraan successful.");

    console.log("\n--- Testing POST /api/gizi/kendaraan (Inactive) ---");
    const inactiveCarRes = await fetch(`${baseUrl}/gizi/kendaraan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        namaKendaraan: "Suzuki Carry Box 02",
        platNomor: "B 5678 SPG",
        aktif: false
      })
    });
    const inactiveCarData = await inactiveCarRes.json();
    if (inactiveCarRes.status !== 201) throw new Error(`Expected 201, got ${inactiveCarRes.status}`);
    testInactiveKendaraanId = inactiveCarData.id;
    console.log("POST Inactive Kendaraan successful.");

    // =========================================================================
    // SECTION 2: MenuHarian setup
    // =========================================================================
    console.log("\n--- POST /api/gizi/menu-harian ---");
    const targetTanggal = "2026-01-12";
    const postRes = await fetch(`${baseUrl}/gizi/menu-harian`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId,
        tanggal: targetTanggal,
        blok: [
          { kelompokUmurMenuId: koId }
        ]
      })
    });
    const postData = await postRes.json();
    if (postRes.status !== 201) {
      throw new Error(`Expected status 201, got ${postRes.status}`);
    }
    testMenuHarianId = postData.id;
    testBlockId = postData.blok[0].id;
    console.log("POST MenuHarian and Block successful.");

    // Create an Approval referencing this MenuHarian
    const approval = await prismaDb.approval.create({
      data: {
        menuHarianId: testMenuHarianId,
        status: "DRAFT",
        approvedById: userKepala.id
      }
    });
    testApprovalId = approval.id;
    console.log("Setup dummy Approval successful. ID:", testApprovalId);

    // =========================================================================
    // SECTION 3: PengirimanHarian tests
    // =========================================================================
    console.log("\n--- Testing POST /api/gizi/pengiriman (Validation: Inactive Vehicle) ---");
    const invalidShipRes = await fetch(`${baseUrl}/gizi/pengiriman`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        menuHarianId: testMenuHarianId,
        jenisPorsi: "BESAR",
        kendaraanId: testInactiveKendaraanId,
        catatan: "This should fail"
      })
    });
    const invalidShipData = await invalidShipRes.json();
    if (invalidShipRes.status !== 400) {
      throw new Error(`Expected 400 for inactive vehicle, got ${invalidShipRes.status}`);
    }
    console.log("POST with inactive vehicle correctly rejected: ", invalidShipData.error);

    console.log("\n--- Testing POST /api/gizi/pengiriman (Success) ---");
    const shipRes = await fetch(`${baseUrl}/gizi/pengiriman`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        menuHarianId: testMenuHarianId,
        jenisPorsi: "BESAR",
        kendaraanId: testKendaraanId,
        catatan: "Pengantaran porsi besar"
      })
    });
    const shipData = await shipRes.json();
    if (shipRes.status !== 201) throw new Error(`Expected 201, got ${shipRes.status}`);
    testPengirimanId = shipData.id;
    console.log("POST PengirimanHarian successful.");

    // Test PUT PengirimanHarian self-update (no change to menuHarianId/jenisPorsi) -> should succeed
    console.log("\n--- Testing PUT /api/gizi/pengiriman/:id (Self Update) ---");
    const selfPutRes = await fetch(`${baseUrl}/gizi/pengiriman/${testPengirimanId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        menuHarianId: testMenuHarianId,
        jenisPorsi: "BESAR",
        catatan: "Updated notes"
      })
    });
    const selfPutData = await selfPutRes.json();
    if (selfPutRes.status !== 200) {
      throw new Error(`Expected 200 for self update, got ${selfPutRes.status}: ${JSON.stringify(selfPutData)}`);
    }
    console.log("PUT self-update successfully passed.");

    // =========================================================================
    // SECTION 4: Cascade Deletions Real Assertions
    // =========================================================================
    console.log("\n--- Testing API Cascade Deletions (MenuHarian -> block, approval, pengiriman) ---");
    
    // Call DELETE MenuHarian via API
    const delRes = await fetch(`${baseUrl}/gizi/menu-harian/${testMenuHarianId}`, { method: "DELETE", headers });
    if (!delRes.ok) {
      const delData = await delRes.json();
      throw new Error(`DELETE MenuHarian via API failed: ${JSON.stringify(delData)}`);
    }
    console.log("Parent MenuHarian deleted via API.");

    // Assert that all children rows in DB are deleted
    const dbShipment = await prismaDb.pengirimanHarian.findUnique({ where: { id: testPengirimanId } });
    const dbBlock = await prismaDb.menuHarianBlok.findUnique({ where: { id: testBlockId } });
    const dbApproval = await prismaDb.approval.findUnique({ where: { id: testApprovalId } });

    if (dbShipment !== null) throw new Error("Cascade delete failed: PengirimanHarian still exists!");
    if (dbBlock !== null) throw new Error("Cascade delete failed: MenuHarianBlok still exists!");
    if (dbApproval !== null) throw new Error("Cascade delete failed: Approval still exists!");

    console.log("Cascade deletion verification succeeded for all children relations!");

    // Set variables to null
    testPengirimanId = null;
    testMenuHarianId = null;
    testBlockId = null;
    testApprovalId = null;

    // Clean up vehicles
    console.log("\n--- Clean up Vehicles ---");
    const delCar1 = await fetch(`${baseUrl}/gizi/kendaraan/${testKendaraanId}`, { method: "DELETE", headers });
    const delCar2 = await fetch(`${baseUrl}/gizi/kendaraan/${testInactiveKendaraanId}`, { method: "DELETE", headers });
    if (!delCar1.ok || !delCar2.ok) throw new Error("DELETE Kendaraan failed");
    testKendaraanId = null;
    testInactiveKendaraanId = null;
    console.log("All vehicles cleaned up.");

  } finally {
    // Final emergency DB cleanup
    if (testApprovalId) {
      await prismaDb.approval.delete({ where: { id: testApprovalId } }).catch(() => {});
    }
    if (testPengirimanId) {
      await prismaDb.pengirimanHarian.delete({ where: { id: testPengirimanId } }).catch(() => {});
    }
    if (testBlockId) {
      await prismaDb.menuHarianBlok.delete({ where: { id: testBlockId } }).catch(() => {});
    }
    if (testMenuHarianId) {
      await prismaDb.menuHarian.delete({ where: { id: testMenuHarianId } }).catch(() => {});
    }
    if (testKendaraanId) {
      await prismaDb.kendaraan.delete({ where: { id: testKendaraanId } }).catch(() => {});
    }
    if (testInactiveKendaraanId) {
      await prismaDb.kendaraan.delete({ where: { id: testInactiveKendaraanId } }).catch(() => {});
    }
    await prismaDb.$disconnect();
  }

  console.log("\nALL KENDARAAN & PENGIRIMAN ENDPOINTS & VALIDATIONS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
