const baseUrl = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING ASLAP API INTEGRATION TESTS ===");
  console.log("Test File Path: backend/src/routes/__tests__/aslap.js");

  // 1. Authenticate
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "aslap",
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

  // NEW: Test scenario for user status check in requireAuth (deactivated user token rejection)
  console.log("\n--- Testing Deactivated User Token Rejection ---");
  const { PrismaClient } = require("@prisma/client");
  const prismaDb = new PrismaClient();
  try {
    // A. Temporarily set user "aslap" to active: false
    await prismaDb.user.update({
      where: { username: "aslap" },
      data: { aktif: false }
    });

    // B. Attempt to fetch periods with the existing token (should be rejected with 401)
    const testDeactivatedRes = await fetch(`${baseUrl}/aslap/periode`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    const testDeactivatedData = await testDeactivatedRes.json();

    if (testDeactivatedRes.status !== 401) {
      throw new Error(`Expected status 401 for deactivated user, but got ${testDeactivatedRes.status}: ${JSON.stringify(testDeactivatedData)}`);
    }
    console.log("Deactivated user token correctly rejected with 401:", testDeactivatedData.error);
  } finally {
    // C. Re-enable user "aslap" to active: true
    await prismaDb.user.update({
      where: { username: "aslap" },
      data: { aktif: true }
    });
    await prismaDb.$disconnect();
  }

  // 2. Fetch Period and Categories
  const periodsRes = await fetch(`${baseUrl}/aslap/periode`, { headers });
  const periods = await periodsRes.json();
  const periodeId = periods[0].id;
  console.log(`Using Periode: ${periodeId}`);

  const katRes = await fetch(`${baseUrl}/aslap/kategori`, { headers });
  const categories = await katRes.json();
  const katSiswa = categories.find(k => k.jenisSasaran === "PESERTA_DIDIK");
  const katNonSiswa = categories.find(k => k.jenisSasaran === "NON_PESERTA_DIDIK");

  // Arrays to track dynamic IDs to clean up at the end
  const createdPMRIds = [];
  const createdSchoolIds = [];
  const createdPosyanduIds = [];

  try {
    // =========================================================================
    // GAP #1: XOR Validation Tests (sekolahId and posyanduId XOR check)
    // =========================================================================
    console.log("\n--- Testing XOR Validation ---");

    // Case 1: Both filled
    const xorBothBody = {
      periodeId,
      hariAktif: ["SENIN"],
      detail: [
        {
          kategoriId: katSiswa.id,
          sekolahNama: "Sekolah XOR Test",
          posyanduNama: "Posyandu XOR Test",
          lakiLaki: 10,
          perempuan: 10
        }
      ]
    };
    const xorBothRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(xorBothBody)
    });
    const xorBothData = await xorBothRes.json();
    if (xorBothRes.ok) {
      throw new Error("XOR check failed: Allowed both sekolah and posyandu to be filled simultaneously!");
    }
    console.log("XOR (Both filled) correctly rejected:", xorBothData.error);

    // Case 2: Both empty
    const xorNoneBody = {
      periodeId,
      hariAktif: ["SENIN"],
      detail: [
        {
          kategoriId: katSiswa.id,
          lakiLaki: 10,
          perempuan: 10
        }
      ]
    };
    const xorNoneRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(xorNoneBody)
    });
    const xorNoneData = await xorNoneRes.json();
    if (xorNoneRes.ok) {
      throw new Error("XOR check failed: Allowed both sekolah and posyandu to be left empty!");
    }
    console.log("XOR (Both empty) correctly rejected:", xorNoneData.error);


    // =========================================================================
    // NEW: Transactional Rollback Test
    // =========================================================================
    console.log("\n--- Testing Transactional Rollback ---");
    const rollbackSchoolName = `sekolah rollback test ${Date.now()}`;
    const rollbackBody = {
      periodeId,
      hariAktif: ["SENIN"],
      detail: [
        {
          kategoriId: katSiswa.id,
          sekolahNama: rollbackSchoolName,
          lakiLaki: 10,
          perempuan: 10
        },
        {
          kategoriId: katSiswa.id,
          sekolahNama: "Some School",
          lakiLaki: -5, // Invalid value, causes validation to fail on second row
          perempuan: 10
        }
      ]
    };
    const rollbackRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(rollbackBody)
    });
    const rollbackData = await rollbackRes.json();
    if (rollbackRes.ok) {
      throw new Error("Transactional rollback check failed: Request succeeded but was expected to fail validation!");
    }
    console.log("Invalid request correctly rejected:", rollbackData.error);

    // Fetch all schools to verify that rollbackSchoolName was NOT saved to the DB
    const verificationSchoolRes = await fetch(`${baseUrl}/aslap/sekolah`, { headers });
    const verificationSchools = await verificationSchoolRes.json();
    const leakedSchool = verificationSchools.find(s => s.nama.toLowerCase() === rollbackSchoolName.toLowerCase());
    if (leakedSchool) {
      throw new Error("BUG DETECTED: Dynamic school creation leaked into database even though the request failed validation!");
    }
    console.log("Transactional rollback verified: No schools leaked into the database.");


    // =========================================================================
    // NEW: Concurrent Request Race Condition / Atomicity Test (Run 10x loop)
    // =========================================================================
    console.log("\n--- Testing Concurrent Overlap Requests (10x Loop) ---");
    for (let loop = 1; loop <= 10; loop++) {
      console.log(`\n--- Loop Iteration ${loop}/10 ---`);
      const concurrentBody1 = {
        periodeId,
        hariAktif: ["SABTU"],
        detail: [
          {
            kategoriId: katSiswa.id,
            sekolahNama: `Sekolah Konkuren A ${loop} ${Date.now()}`,
            lakiLaki: 5,
            perempuan: 5
          }
        ]
      };
      const concurrentBody2 = {
        periodeId,
        hariAktif: ["SABTU"], // Same day, must not overlap!
        detail: [
          {
            kategoriId: katSiswa.id,
            sekolahNama: `Sekolah Konkuren B ${loop} ${Date.now()}`,
            lakiLaki: 5,
            perempuan: 5
          }
        ]
      };

      // Send both POST requests simultaneously
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/aslap/penerima-manfaat`, {
          method: "POST",
          headers,
          body: JSON.stringify(concurrentBody1)
        }),
        fetch(`${baseUrl}/aslap/penerima-manfaat`, {
          method: "POST",
          headers,
          body: JSON.stringify(concurrentBody2)
        })
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      console.log(`[Loop ${loop}] Request 1 Status:`, res1.status);
      console.log(`[Loop ${loop}] Request 2 Status:`, res2.status);

      // One must succeed (201) and one must fail (400)
      const successCount = (res1.status === 201 ? 1 : 0) + (res2.status === 201 ? 1 : 0);
      const failureCount = (res1.status === 400 ? 1 : 0) + (res2.status === 400 ? 1 : 0);

      if (successCount !== 1 || failureCount !== 1) {
        // Cleanup if any succeeded
        if (res1.status === 201) await fetch(`${baseUrl}/aslap/penerima-manfaat/${data1.id}`, { method: "DELETE", headers });
        if (res2.status === 201) await fetch(`${baseUrl}/aslap/penerima-manfaat/${data2.id}`, { method: "DELETE", headers });
        throw new Error(`Race condition check failed at loop ${loop}: Exactly one request should have succeeded, but got ${successCount} successes and ${failureCount} failures!`);
      }

      // Cleanup the successful record immediately to clear the day for next iteration
      const successData = res1.status === 201 ? data1 : data2;
      const delRes = await fetch(`${baseUrl}/aslap/penerima-manfaat/${successData.id}`, { method: "DELETE", headers });
      if (!delRes.ok) {
        throw new Error(`Failed to clean up successful record at loop ${loop}: ${delRes.status}`);
      }

      // Keep school ID to clean up in finally block
      const detailItem = successData.detail.find(d => d.sekolahId);
      if (detailItem) createdSchoolIds.push(detailItem.sekolahId);
    }

    console.log("\nConcurrent race condition test passed: All 10 loop iterations correctly allowed only one request to succeed.");

    // GAP #3: Case-Insensitivity & Duplication check on dynamic Sekolah
    // =========================================================================
    console.log("\n--- Testing case-insensitive findOrCreate for Sekolah ---");
    const uniqueSchoolNameLower = `sekolah test case ${Date.now()}`;
    const uniqueSchoolNameUpper = uniqueSchoolNameLower.toUpperCase();

    // 1st request creates the school
    const createFirstBody = {
      periodeId,
      hariAktif: ["SENIN"],
      detail: [
        {
          kategoriId: katSiswa.id,
          sekolahNama: uniqueSchoolNameLower,
          lakiLaki: 5,
          perempuan: 5
        }
      ]
    };
    const createFirstRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(createFirstBody)
    });
    const firstData = await createFirstRes.json();
    if (!createFirstRes.ok) {
      throw new Error(`Failed to create first record: ${JSON.stringify(firstData)}`);
    }
    createdPMRIds.push(firstData.id);

    const firstDetail = firstData.detail.find(d => d.sekolahId);
    if (!firstDetail) {
      throw new Error("Could not find detail with schoolId in created object");
    }
    const schoolId1 = firstDetail.sekolahId;
    createdSchoolIds.push(schoolId1);
    console.log(`First request created school ID: ${schoolId1}`);

    // Delete this PMR record so the active day SENIN is free again
    await fetch(`${baseUrl}/aslap/penerima-manfaat/${firstData.id}`, { method: "DELETE", headers });
    createdPMRIds.pop();

    // 2nd request with UPPER CASE name should find and reuse the same school ID
    const createSecondBody = {
      periodeId,
      hariAktif: ["SENIN"],
      detail: [
        {
          kategoriId: katSiswa.id,
          sekolahNama: uniqueSchoolNameUpper,
          lakiLaki: 12,
          perempuan: 12
        }
      ]
    };
    const createSecondRes = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(createSecondBody)
    });
    const secondData = await createSecondRes.json();
    if (!createSecondRes.ok) {
      throw new Error(`Failed to create second record: ${JSON.stringify(secondData)}`);
    }
    createdPMRIds.push(secondData.id);

    const secondDetail = secondData.detail.find(d => d.sekolahId);
    const schoolId2 = secondDetail.sekolahId;
    console.log(`Second request resolved school ID: ${schoolId2}`);

    if (schoolId1 !== schoolId2) {
      throw new Error("Case-insensitive findOrCreate failed: Created a duplicate School entry instead of reusing existing!");
    }
    console.log("Case-insensitive findOrCreate verified successfully.");


    // =========================================================================
    // GAP #4 & #2: Overlap check during creation and update (including self-overlap)
    // =========================================================================
    console.log("\n--- Testing Overlap Checks (Create & Update) ---");

    // Let's clean up previous record
    await fetch(`${baseUrl}/aslap/penerima-manfaat/${secondData.id}`, { method: "DELETE", headers });
    createdPMRIds.pop();

    // Create Record A: hariAktif = ["SENIN", "SELASA"]
    const recordABody = {
      periodeId,
      hariAktif: ["SENIN", "SELASA"],
      detail: [
        {
          kategoriId: katSiswa.id,
          sekolahId: schoolId1,
          lakiLaki: 10,
          perempuan: 10
        }
      ]
    };
    const resA = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(recordABody)
    });
    const dataA = await resA.json();
    if (!resA.ok) throw new Error(`Failed to create Record A: ${JSON.stringify(dataA)}`);
    createdPMRIds.push(dataA.id);
    console.log("Record A created with days: [SENIN, SELASA]");

    // Create Record B: hariAktif = ["RABU", "KAMIS"]
    const recordBBody = {
      periodeId,
      hariAktif: ["RABU", "KAMIS"],
      detail: [
        {
          kategoriId: katSiswa.id,
          sekolahId: schoolId1,
          lakiLaki: 8,
          perempuan: 8
        }
      ]
    };
    const resB = await fetch(`${baseUrl}/aslap/penerima-manfaat`, {
      method: "POST",
      headers,
      body: JSON.stringify(recordBBody)
    });
    const dataB = await resB.json();
    if (!resB.ok) throw new Error(`Failed to create Record B: ${JSON.stringify(dataB)}`);
    createdPMRIds.push(dataB.id);
    console.log("Record B created with days: [RABU, KAMIS]");

    // Update Record B: try to overlap with Record A (assigning SELASA, RABU)
    console.log("Attempting to update Record B to [SELASA, RABU] (should fail due to SELASA overlap with Record A)...");
    const updateOverlapRes = await fetch(`${baseUrl}/aslap/penerima-manfaat/${dataB.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        hariAktif: ["SELASA", "RABU"]
      })
    });
    const updateOverlapData = await updateOverlapRes.json();
    if (updateOverlapRes.ok) {
      throw new Error("Update overlap check failed: Allowed overlapping update!");
    }
    console.log("Update overlap check correctly rejected:", updateOverlapData.error);

    // Update Record B: update to [RABU, JUMAT] (should succeed, since RABU is its own day and JUMAT is empty)
    console.log("Attempting to update Record B to [RABU, JUMAT] (should succeed)...");
    const updateSelfRes = await fetch(`${baseUrl}/aslap/penerima-manfaat/${dataB.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        hariAktif: ["RABU", "JUMAT"]
      })
    });
    const updateSelfData = await updateSelfRes.json();
    if (!updateSelfRes.ok) {
      throw new Error(`Self-overlap/valid update check failed: ${JSON.stringify(updateSelfData)}`);
    }
    console.log("Update self-overlap & valid update successful. New days:", updateSelfData.hariAktif);

  } finally {
    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log("\n--- Cleaning up temporary test data ---");
    for (const pmrId of createdPMRIds) {
      await fetch(`${baseUrl}/aslap/penerima-manfaat/${pmrId}`, { method: "DELETE", headers });
    }
    // Direct SQL cleanup for dynamic master data to keep DB pristine
    // Since we created Sekolah in the test, we delete them directly
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    try {
      if (createdSchoolIds.length > 0) {
        await prisma.sekolah.deleteMany({
          where: { id: { in: createdSchoolIds } }
        });
        console.log(`Deleted dynamic test schools: ${createdSchoolIds.join(", ")}`);
      }
      if (createdPosyanduIds.length > 0) {
        await prisma.posyandu.deleteMany({
          where: { id: { in: createdPosyanduIds } }
        });
        console.log(`Deleted dynamic test posyandus: ${createdPosyanduIds.join(", ")}`);
      }
    } catch (cleanupError) {
      console.error("Master data cleanup error:", cleanupError);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log("\nALL ASLAP API INTEGRATION TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
