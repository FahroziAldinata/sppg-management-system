const { PrismaClient } = require("@prisma/client");
const prismaDb = new PrismaClient();
const baseUrl = "http://localhost:3000/api";

async function testPutMenuHarianStatus(prismaDb, baseUrl, headers) {
  console.log("\n=== STARTING PUT MENU HARIAN STATUS & SECURITY TESTS ===");
  
  // 1. Dapatkan periode valid dari database secara dinamis
  const periode = await prismaDb.periode.findFirst();
  if (!periode) {
    throw new Error("Tidak ada Periode di database, jalankan seed.js terlebih dahulu!");
  }
  const periodeId = periode.id;

  // Guard Durasi Periode: Pastikan rentang periode minimal 4 hari agar offset test valid
  const diffTime = Math.abs(new Date(periode.tanggalSelesai) - new Date(periode.tanggalMulai));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 4) {
    throw new Error(`Periode (ID: ${periodeId}) terlalu pendek buat test ini, butuh minimal 4 hari (saat ini ${diffDays} hari).`);
  }

  // 2. Turunkan tanggal uji secara dinamis
  const start = new Date(periode.tanggalMulai);
  
  const date1 = new Date(start);
  date1.setDate(start.getDate() + 1);
  const dateStr1 = date1.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const date2 = new Date(start);
  date2.setDate(start.getDate() + 2);
  const dateStr2 = date2.toISOString().split("T")[0]; // "YYYY-MM-DD"

  const date3 = new Date(start);
  date3.setDate(start.getDate() + 3);
  const dateStr3 = date3.toISOString().split("T")[0]; // "YYYY-MM-DD"

  let menu1Id = null;
  let menu2Id = null;

  // Try-Catch Terisolasi untuk Setup Awal Data Test
  try {
    // Setup 1: Buat MenuHarian pertama (default DRAFT)
    const m1 = await prismaDb.menuHarian.create({
      data: {
        periodeId,
        tanggal: new Date(dateStr1),
        status: "DRAFT"
      }
    });
    menu1Id = m1.id;

    // Setup 2: Buat MenuHarian kedua
    const m2 = await prismaDb.menuHarian.create({
      data: {
        periodeId,
        tanggal: new Date(dateStr2),
        status: "DRAFT"
      }
    });
    menu2Id = m2.id;
  } catch (err) {
    console.error("Setup data test gagal, kemungkinan ada konflik data MenuHarian existing di periode ini:", err);
    throw new Error("Setup test data failed due to potential unique constraint conflicts on MenuHarian tanggal.");
  }

  try {
    // --- CASE 1: PUT status ke DIAJUKAN saat existing.status = DRAFT -> Sukses (200) ---
    console.log("Testing: PUT status to DIAJUKAN (from DRAFT)...");
    const res1 = await fetch(`${baseUrl}/gizi/menu-harian/${menu1Id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: "DIAJUKAN" })
    });
    if (res1.status !== 200) {
      throw new Error(`Expected 200, got ${res1.status}`);
    }
    const updatedM1 = await prismaDb.menuHarian.findUnique({ where: { id: menu1Id } });
    if (updatedM1.status !== "DIAJUKAN") {
      throw new Error(`Status should be DIAJUKAN, got ${updatedM1.status}`);
    }
    console.log("Success: Status successfully transitioned to DIAJUKAN.");

    // --- CASE 2: PUT (apapun) saat existing.status = DIAJUKAN -> Gagal (400) ---
    console.log("Testing: PUT when status is DIAJUKAN...");
    const res2 = await fetch(`${baseUrl}/gizi/menu-harian/${menu1Id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ tanggal: dateStr3 })
    });
    if (res2.status !== 400) {
      throw new Error(`Expected 400 for blocked edit during DIAJUKAN, got ${res2.status}`);
    }
    console.log("Success: Edit blocked during DIAJUKAN status.");

    // Manually force status to DISETUJUI di DB untuk keperluan Case 3
    await prismaDb.menuHarian.update({
      where: { id: menu1Id },
      data: { status: "DISETUJUI" }
    });

    // --- CASE 3: PUT (apapun) saat existing.status = DISETUJUI -> Gagal (400) ---
    console.log("Testing: PUT when status is DISETUJUI...");
    const res3 = await fetch(`${baseUrl}/gizi/menu-harian/${menu1Id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ tanggal: dateStr3 })
    });
    if (res3.status !== 400) {
      throw new Error(`Expected 400 for blocked edit during DISETUJUI, got ${res3.status}`);
    }
    console.log("Success: Edit blocked during DISETUJUI status.");

    // Reset status kembali ke DRAFT di DB untuk keperluan Case 4
    await prismaDb.menuHarian.update({
      where: { id: menu1Id },
      data: { status: "DRAFT" }
    });

    // --- CASE 4: PUT status="DISETUJUI" langsung dari payload -> Gagal (400) ---
    console.log("Testing: PUT status='DISETUJUI' directly (guard check)...");
    const res4 = await fetch(`${baseUrl}/gizi/menu-harian/${menu1Id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: "DISETUJUI" })
    });
    if (res4.status !== 400) {
      throw new Error(`Expected 400 for illegal status DISETUJUI, got ${res4.status}`);
    }
    console.log("Success: Illegal status directly from payload rejected.");

    // --- CASE 5: PUT ke tanggal bentrok (P2002 natural) -> Gagal (409) ---
    console.log("Testing: PUT to duplicate date (P2002 conflict)...");
    const res5 = await fetch(`${baseUrl}/gizi/menu-harian/${menu1Id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ tanggal: dateStr2 }) // Menggunakan tanggal yang sama dengan menu2Id
    });
    if (res5.status !== 409) {
      throw new Error(`Expected 409 Conflict, got ${res5.status}`);
    }
    console.log("Success: Duplicate date update rejected with 409 Conflict.");

  } finally {
    // 3. Cleanup dengan try-catch terisolasi per entitas
    console.log("\n--- Cleaning up temporary test data ---");
    if (menu1Id) {
      try {
        await prismaDb.menuHarian.delete({ where: { id: menu1Id } });
        console.log(`Deleted test MenuHarian ID: ${menu1Id}`);
      } catch (e) {
        console.error(`Failed to delete test MenuHarian ID: ${menu1Id}`, e);
      }
    }
    if (menu2Id) {
      try {
        await prismaDb.menuHarian.delete({ where: { id: menu2Id } });
        console.log(`Deleted test MenuHarian ID: ${menu2Id}`);
      } catch (e) {
        console.error(`Failed to delete test MenuHarian ID: ${menu2Id}`, e);
      }
    }
  }
}

async function testPostApproval(prismaDb, baseUrl, kepalaHeaders) {
  console.log("\n=== STARTING POST APPROVAL CONCURRENCY & VALIDATION TESTS ===");
  
  // Dapatkan periode valid secara dinamis
  const periode = await prismaDb.periode.findFirst();
  if (!periode) {
    throw new Error("Tidak ada Periode di database, jalankan seed.js terlebih dahulu!");
  }
  const periodeId = periode.id;

  // Guard durasi periode
  const diffTime = Math.abs(new Date(periode.tanggalSelesai) - new Date(periode.tanggalMulai));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 4) {
    throw new Error(`Periode (ID: ${periodeId}) terlalu pendek buat test ini, butuh minimal 4 hari.`);
  }

  // Offset tanggal uji
  const start = new Date(periode.tanggalMulai);
  const date1 = new Date(start);
  date1.setDate(start.getDate() + 1);
  const dateStr1 = date1.toISOString().split("T")[0];

  let testMenuId = null;

  try {
    // Setup Awal Data Test dengan try-catch terisolasi
    try {
      const menu = await prismaDb.menuHarian.create({
        data: {
          periodeId,
          tanggal: new Date(dateStr1),
          status: "DRAFT"
        }
      });
      testMenuId = menu.id;
    } catch (err) {
      console.error("Setup data test gagal, kemungkinan ada konflik data MenuHarian existing:", err);
      throw new Error("Setup test data failed.");
    }

    // --- CASE 1: POST dengan menuHarianId + rabHarianId keduanya diisi -> Gagal (400) ---
    console.log("Testing: Both menuHarianId and rabHarianId filled...");
    const res1 = await fetch(`${baseUrl}/kepala/approval`, {
      method: "POST",
      headers: kepalaHeaders,
      body: JSON.stringify({
        menuHarianId: testMenuId,
        rabHarianId: "dummy-rab-id",
        status: "DISETUJUI"
      })
    });
    if (res1.status !== 400) {
      throw new Error(`Expected 400, got ${res1.status}`);
    }
    console.log("Success: Mutually exclusive validation passed.");

    // --- CASE 2: POST ke target status DRAFT (bukan DIAJUKAN) -> Gagal (400) ---
    console.log("Testing: POST to target with DRAFT status...");
    const res2 = await fetch(`${baseUrl}/kepala/approval`, {
      method: "POST",
      headers: kepalaHeaders,
      body: JSON.stringify({
        menuHarianId: testMenuId,
        status: "DISETUJUI"
      })
    });
    if (res2.status !== 400) {
      throw new Error(`Expected 400, got ${res2.status}`);
    }
    console.log("Success: Locked DRAFT status validation passed.");

    // Paksa status ke DIAJUKAN secara manual di DB untuk test berikutnya
    await prismaDb.menuHarian.update({
      where: { id: testMenuId },
      data: { status: "DIAJUKAN" }
    });

    // --- CASE 3: POST status DITOLAK tanpa catatan -> Gagal (400) ---
    console.log("Testing: POST DITOLAK without notes...");
    const res3 = await fetch(`${baseUrl}/kepala/approval`, {
      method: "POST",
      headers: kepalaHeaders,
      body: JSON.stringify({
        menuHarianId: testMenuId,
        status: "DITOLAK"
      })
    });
    if (res3.status !== 400) {
      throw new Error(`Expected 400, got ${res3.status}`);
    }
    console.log("Success: Rejected status without notes validation passed.");

    // --- CASE 4: POST status DITOLAK dengan catatan spasi doang -> Gagal (400) ---
    console.log("Testing: POST DITOLAK with whitespace-only notes...");
    const res4 = await fetch(`${baseUrl}/kepala/approval`, {
      method: "POST",
      headers: kepalaHeaders,
      body: JSON.stringify({
        menuHarianId: testMenuId,
        status: "DITOLAK",
        catatan: "   "
      })
    });
    if (res4.status !== 400) {
      throw new Error(`Expected 400, got ${res4.status}`);
    }
    console.log("Success: Rejected status with whitespace-only notes validation passed.");

    // --- CASE 5: Uji Konkurensi / Row Lock (Promise.all) -> Satu 201, Satu 400 ---
    console.log("Testing: Concurrent POST approvals (row lock verification)...");
    const [cres1, cres2] = await Promise.all([
      fetch(`${baseUrl}/kepala/approval`, {
        method: "POST",
        headers: kepalaHeaders,
        body: JSON.stringify({
          menuHarianId: testMenuId,
          status: "DISETUJUI"
        })
      }),
      fetch(`${baseUrl}/kepala/approval`, {
        method: "POST",
        headers: kepalaHeaders,
        body: JSON.stringify({
          menuHarianId: testMenuId,
          status: "DISETUJUI"
        })
      })
    ]);

    const statusCodes = [cres1.status, cres2.status].sort((a, b) => a - b);
    if (statusCodes[0] !== 201 || statusCodes[1] !== 400) {
      throw new Error(`Expected one 201 and one 400, got: ${cres1.status} and ${cres2.status}`);
    }
    console.log("Success: Concurrency / row-lock test passed! Exactly one request succeeded (201) and the other was blocked and rejected (400).");

    // Verifikasi state akhir di DB
    const finalMenu = await prismaDb.menuHarian.findUnique({ where: { id: testMenuId } });
    if (finalMenu.status !== "DISETUJUI") {
      throw new Error(`Target status should be DISETUJUI, got ${finalMenu.status}`);
    }
    console.log("Success: Target status correctly updated to DISETUJUI in database.");

  } finally {
    // Cleanup dengan try-catch terisolasi
    console.log("\n--- Cleaning up temporary test data ---");
    if (testMenuId) {
      try {
        await prismaDb.approval.deleteMany({
          where: { menuHarianId: testMenuId }
        });
        console.log("Cleaned up approvals for test menu.");
      } catch (err) {
        console.error("Failed to delete approvals for test menu:", err);
      }

      try {
        await prismaDb.menuHarian.delete({
          where: { id: testMenuId }
        });
        console.log(`Deleted test MenuHarian ID: ${testMenuId}`);
      } catch (err) {
        console.error(`Failed to delete test MenuHarian ID: ${testMenuId}`, err);
      }
    }
  }
}

async function testPostApprovalRabHarian(prismaDb, baseUrl, kepalaHeaders) {
  console.log("\n=== STARTING POST APPROVAL FOR RAB HARIAN ===");
  
  const periode = await prismaDb.periode.findFirst();
  if (!periode) {
    throw new Error("Tidak ada Periode di database, jalankan seed.js terlebih dahulu!");
  }
  const periodeId = periode.id;

  const start = new Date(periode.tanggalMulai);
  const testDate = new Date(start);
  testDate.setDate(start.getDate() + 3);
  const testDateStr = testDate.toISOString().split("T")[0];

  const userAkuntan = await prismaDb.user.findFirst({ where: { role: "AKUNTAN" } });
  if (!userAkuntan) {
    throw new Error("Tidak ada user AKUNTAN di database");
  }

  let testRabId = null;

  try {
    // Setup RabHarian (wajib createdById, periodeId, tanggal)
    try {
      const rab = await prismaDb.rabHarian.create({
        data: {
          periodeId,
          tanggal: new Date(testDateStr),
          status: "DIAJUKAN", // Force status langsung ke DIAJUKAN untuk di-approve
          createdById: userAkuntan.id
        }
      });
      testRabId = rab.id;
    } catch (err) {
      console.error("Setup data test RabHarian gagal:", err);
      throw new Error("Setup test RabHarian failed.");
    }

    // --- CASE: POST approval DISETUJUI untuk RabHarian -> 201, status terupdate ---
    console.log("Testing: POST approval for RabHarian...");
    const res = await fetch(`${baseUrl}/kepala/approval`, {
      method: "POST",
      headers: kepalaHeaders,
      body: JSON.stringify({
        rabHarianId: testRabId,
        status: "DISETUJUI"
      })
    });

    if (res.status !== 201) {
      const resBody = await res.json();
      throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(resBody)}`);
    }

    const updatedRab = await prismaDb.rabHarian.findUnique({ where: { id: testRabId } });
    if (updatedRab.status !== "DISETUJUI") {
      throw new Error(`RAB Harian status should be DISETUJUI, got ${updatedRab.status}`);
    }
    console.log("Success: RAB Harian status successfully updated to DISETUJUI.");

  } finally {
    // Cleanup approvals first
    if (testRabId) {
      try {
        await prismaDb.approval.deleteMany({
          where: { rabHarianId: testRabId }
        });
        console.log("Cleaned up approvals for test RAB.");
      } catch (err) {
        console.error("Failed to delete approvals for test RAB:", err);
      }

      try {
        await prismaDb.rabHarian.delete({
          where: { id: testRabId }
        });
        console.log(`Deleted test RabHarian ID: ${testRabId}`);
      } catch (err) {
        console.error(`Failed to delete test RabHarian ID: ${testRabId}`, err);
      }
    }
  }
}

async function testGetApprovals(prismaDb, baseUrl, kepalaHeaders, giziHeaders) {
  console.log("\n=== STARTING GET APPROVAL HISTORY TESTS ===");

  const periode = await prismaDb.periode.findFirst();
  if (!periode) {
    throw new Error("Tidak ada Periode di database");
  }
  const periodeId = periode.id;

  // --- CASE 1: Tanpa periodeId -> Gagal (400) ---
  console.log("Testing: GET approvals without periodeId...");
  const res1 = await fetch(`${baseUrl}/kepala/approval`, {
    method: "GET",
    headers: kepalaHeaders
  });
  if (res1.status !== 400) {
    throw new Error(`Expected 400, got ${res1.status}`);
  }
  const body1 = await res1.json();
  if (!body1.error || !body1.error.includes("periodeId")) {
    throw new Error("Expected error message to mention 'periodeId'");
  }
  console.log("Success: Mandatory periodeId query validation passed.");

  // Setup test data
  const start = new Date(periode.tanggalMulai);
  const d1 = new Date(start);
  d1.setDate(start.getDate() + 1);
  const d2 = new Date(start);
  d2.setDate(start.getDate() + 2);

  const userKepala = await prismaDb.user.findFirst({ where: { role: "KEPALA_SPPG" } });
  const userAkuntan = await prismaDb.user.findFirst({ where: { role: "AKUNTAN" } });

  let dummyMenu = null;
  let dummyRab = null;
  let approvalMenu = null;
  let approvalRab = null;

  try {
    dummyMenu = await prismaDb.menuHarian.create({
      data: {
        periodeId,
        tanggal: d1,
        status: "DISETUJUI"
      }
    });

    dummyRab = await prismaDb.rabHarian.create({
      data: {
        periodeId,
        tanggal: d2,
        status: "DITOLAK",
        createdById: userAkuntan.id
      }
    });

    approvalMenu = await prismaDb.approval.create({
      data: {
        menuHarianId: dummyMenu.id,
        status: "DISETUJUI",
        catatan: "Menu sehat disetujui",
        approvedById: userKepala.id
      }
    });

    approvalRab = await prismaDb.approval.create({
      data: {
        rabHarianId: dummyRab.id,
        status: "DITOLAK",
        catatan: "Anggaran tidak logis",
        approvedById: userKepala.id
      }
    });

    // --- CASE 2: Filter by status=DISETUJUI ---
    console.log("Testing: GET approvals filtered by status=DISETUJUI...");
    const res2 = await fetch(`${baseUrl}/kepala/approval?periodeId=${periodeId}&status=DISETUJUI`, {
      method: "GET",
      headers: kepalaHeaders
    });
    if (res2.status !== 200) {
      throw new Error(`Expected 200, got ${res2.status}`);
    }
    const body2 = await res2.json();
    if (!Array.isArray(body2.data)) {
      throw new Error("Expected response data to be an array");
    }
    const hasWrongStatus = body2.data.some(app => app.status !== "DISETUJUI");
    if (hasWrongStatus) {
      throw new Error("Found approval record with status other than DISETUJUI");
    }
    console.log("Success: Status filter validation passed.");

    // --- CASE 3: Filter by targetType=MENU ---
    console.log("Testing: GET approvals filtered by targetType=MENU...");
    const res3 = await fetch(`${baseUrl}/kepala/approval?periodeId=${periodeId}&targetType=MENU`, {
      method: "GET",
      headers: kepalaHeaders
    });
    if (res3.status !== 200) {
      throw new Error(`Expected 200, got ${res3.status}`);
    }
    const body3 = await res3.json();
    const hasWrongTarget = body3.data.some(app => app.menuHarianId === null || app.rabHarianId !== null);
    if (hasWrongTarget) {
      throw new Error("Found approval record that is not of MENU type");
    }
    console.log("Success: targetType filter validation passed.");

    // --- CASE 4: Non-KEPALA_SPPG role access -> Gagal (403) ---
    console.log("Testing: GET approvals with non-KEPALA_SPPG role (AHLI_GIZI)...");
    const res4 = await fetch(`${baseUrl}/kepala/approval?periodeId=${periodeId}`, {
      method: "GET",
      headers: giziHeaders
    });
    if (res4.status !== 403) {
      throw new Error(`Expected 403, got ${res4.status}`);
    }
    console.log("Success: Non-KEPALA_SPPG role blocked with 403.");

    // --- CASE 5: Filter status + targetType used together -> Sukses (AND applied) ---
    console.log("Testing: GET approvals filtered by status=DISETUJUI and targetType=MENU...");
    const res5 = await fetch(`${baseUrl}/kepala/approval?periodeId=${periodeId}&status=DISETUJUI&targetType=MENU`, {
      method: "GET",
      headers: kepalaHeaders
    });
    if (res5.status !== 200) {
      throw new Error(`Expected 200, got ${res5.status}`);
    }
    const body5 = await res5.json();
    const hasWrongTargetOrStatus = body5.data.some(
      app => app.status !== "DISETUJUI" || app.menuHarianId === null || app.rabHarianId !== null
    );
    if (hasWrongTargetOrStatus) {
      throw new Error("Found approval record violating status=DISETUJUI AND targetType=MENU constraints");
    }
    console.log("Success: Combined filters applied correctly.");

    // --- CASE 6: Invalid query values -> Gagal (400) ---
    console.log("Testing: GET approvals with invalid status...");
    const res6a = await fetch(`${baseUrl}/kepala/approval?periodeId=${periodeId}&status=FOO`, {
      method: "GET",
      headers: kepalaHeaders
    });
    if (res6a.status !== 400) {
      throw new Error(`Expected 400 for invalid status, got ${res6a.status}`);
    }

    console.log("Testing: GET approvals with invalid targetType...");
    const res6b = await fetch(`${baseUrl}/kepala/approval?periodeId=${periodeId}&targetType=BAR`, {
      method: "GET",
      headers: kepalaHeaders
    });
    if (res6b.status !== 400) {
      throw new Error(`Expected 400 for invalid targetType, got ${res6b.status}`);
    }
    console.log("Success: Invalid filter values rejected with 400.");

  } finally {
    // Clean up per-entity with robust error tracking
    console.log("\n--- Cleaning up GET test approvals data ---");
    if (approvalMenu) {
      try {
        await prismaDb.approval.delete({ where: { id: approvalMenu.id } });
      } catch (err) {
        console.error("Cleanup: Failed to delete approvalMenu:", err.message);
      }
    }
    if (approvalRab) {
      try {
        await prismaDb.approval.delete({ where: { id: approvalRab.id } });
      } catch (err) {
        console.error("Cleanup: Failed to delete approvalRab:", err.message);
      }
    }
    if (dummyMenu) {
      try {
        await prismaDb.menuHarian.delete({ where: { id: dummyMenu.id } });
      } catch (err) {
        console.error("Cleanup: Failed to delete dummyMenu:", err.message);
      }
    }
    if (dummyRab) {
      try {
        await prismaDb.rabHarian.delete({ where: { id: dummyRab.id } });
      } catch (err) {
        console.error("Cleanup: Failed to delete dummyRab:", err.message);
      }
    }
  }
}

async function runAllApprovalTests() {
  console.log("=== STARTING ALL APPROVAL INTEGRATION TESTS ===");
  
  // Login Ahli Gizi for PUT test
  const loginGizi = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "ahligizi", password: "ganti-password-ini" })
  });
  if (!loginGizi.ok) throw new Error("Gizi login failed");
  const { token: giziToken } = await loginGizi.json();
  const giziHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${giziToken}`
  };

  // Login Kepala SPPG for POST approval test
  const loginKepala = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "kepalasppg", password: "ganti-password-ini" })
  });
  if (!loginKepala.ok) throw new Error("Kepala login failed");
  const { token: kepalaToken } = await loginKepala.json();
  const kepalaHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${kepalaToken}`
  };

  try {
    await testPutMenuHarianStatus(prismaDb, baseUrl, giziHeaders);
    await testPostApproval(prismaDb, baseUrl, kepalaHeaders);
    await testPostApprovalRabHarian(prismaDb, baseUrl, kepalaHeaders);
    await testGetApprovals(prismaDb, baseUrl, kepalaHeaders, giziHeaders);
    console.log("\nALL APPROVAL MODULE INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  } finally {
    await prismaDb.$disconnect();
  }
}

runAllApprovalTests();
