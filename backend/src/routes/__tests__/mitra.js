const baseUrl = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING MITRA API INTEGRATION TESTS ===");
  console.log("Test File Path: backend/src/routes/__tests__/mitra.js");

  // 1. Authenticate
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "mitra",
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
  let testHargaBahanId = null;
  const periodeId = "periode-contoh-8-17-jan-2026";

  try {
    // 2. Create a temporary BahanPokok
    const testBahan = await prismaDb.bahanPokok.create({
      data: {
        nama: `Bahan Pokok Test ${Date.now()}`,
        satuan: "kg",
        tipePenyimpanan: "HABIS_HARI_ITU"
      }
    });
    testBahanId = testBahan.id;
    console.log(`Created test BahanPokok: ${testBahan.nama} (ID: ${testBahanId})`);

    // 3. Test GET /api/mitra/bahan-pokok
    console.log("\n--- Testing GET /api/mitra/bahan-pokok ---");
    const getBahanRes = await fetch(`${baseUrl}/mitra/bahan-pokok`, { headers });
    if (!getBahanRes.ok) {
      throw new Error(`Failed GET /api/mitra/bahan-pokok: ${getBahanRes.status}`);
    }
    const bahanList = await getBahanRes.json();
    const foundBahan = bahanList.find(b => b.id === testBahanId);
    if (!foundBahan) {
      throw new Error("Created test BahanPokok not found in GET response");
    }
    console.log("GET /api/mitra/bahan-pokok successful.");

    // 4. Test POST /api/mitra/harga-bahan (success)
    console.log("\n--- Testing POST /api/mitra/harga-bahan (Success Case) ---");
    const postRes = await fetch(`${baseUrl}/mitra/harga-bahan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId,
        bahanPokokId: testBahanId,
        harga: 12500.50,
        isFallback: false
      })
    });
    const postData = await postRes.json();
    if (postRes.status !== 201) {
      throw new Error(`Expected status 201, but got ${postRes.status}: ${JSON.stringify(postData)}`);
    }
    testHargaBahanId = postData.id;
    console.log("POST /api/mitra/harga-bahan successful. Price ID:", testHargaBahanId);

    // 5. Test POST /api/mitra/harga-bahan (conflict/duplicate)
    console.log("\n--- Testing POST /api/mitra/harga-bahan (Conflict Case) ---");
    const duplicateRes = await fetch(`${baseUrl}/mitra/harga-bahan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId,
        bahanPokokId: testBahanId,
        harga: 15000,
        isFallback: true
      })
    });
    const duplicateData = await duplicateRes.json();
    if (duplicateRes.status !== 409) {
      throw new Error(`Expected status 409 Conflict, but got ${duplicateRes.status}: ${JSON.stringify(duplicateData)}`);
    }
    console.log("POST duplicate correctly rejected with 409 Conflict:", duplicateData.error);

    // 6. Test POST /api/mitra/harga-bahan (validation negative price)
    console.log("\n--- Testing POST /api/mitra/harga-bahan (Validation Case) ---");
    const invalidRes = await fetch(`${baseUrl}/mitra/harga-bahan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId,
        bahanPokokId: testBahanId,
        harga: -500,
        isFallback: false
      })
    });
    const invalidData = await invalidRes.json();
    if (invalidRes.status !== 400) {
      throw new Error(`Expected status 400 Bad Request, but got ${invalidRes.status}: ${JSON.stringify(invalidData)}`);
    }
    console.log("POST invalid price correctly rejected with 400 Bad Request:", invalidData.error);

    // 7. Test GET /api/mitra/harga-bahan?periodeId=
    console.log("\n--- Testing GET /api/mitra/harga-bahan?periodeId= ---");
    const listRes = await fetch(`${baseUrl}/mitra/harga-bahan?periodeId=${periodeId}`, { headers });
    if (!listRes.ok) {
      throw new Error(`Failed GET /api/mitra/harga-bahan: ${listRes.status}`);
    }
    const listData = await listRes.json();
    const foundPrice = listData.find(p => p.id === testHargaBahanId);
    if (!foundPrice) {
      throw new Error("Created price not found in list response");
    }
    console.log("GET /api/mitra/harga-bahan list successful.");

    // 8. Test GET /api/mitra/harga-bahan/:id
    console.log("\n--- Testing GET /api/mitra/harga-bahan/:id ---");
    const singleRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, { headers });
    if (!singleRes.ok) {
      throw new Error(`Failed GET /api/mitra/harga-bahan/:id: ${singleRes.status}`);
    }
    const singleData = await singleRes.json();
    if (parseFloat(singleData.harga) !== 12500.50) {
      throw new Error(`Price value mismatch: expected 12500.50, got ${singleData.harga}`);
    }
    console.log("GET /api/mitra/harga-bahan/:id successful.");

    // 9. Test PUT /api/mitra/harga-bahan/:id (success)
    console.log("\n--- Testing PUT /api/mitra/harga-bahan/:id (Success Case) ---");
    const putRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        harga: 13000.00,
        isFallback: true
      })
    });
    const putData = await putRes.json();
    if (putRes.status !== 200) {
      throw new Error(`Expected status 200, but got ${putRes.status}: ${JSON.stringify(putData)}`);
    }
    if (parseFloat(putData.harga) !== 13000.00 || putData.isFallback !== true) {
      throw new Error(`Updated values mismatch: got price ${putData.harga}, isFallback ${putData.isFallback}`);
    }
    console.log("PUT /api/mitra/harga-bahan/:id successful.");

    // 9a. Test PUT /api/mitra/harga-bahan/:id (PUT conflict)
    console.log("\n--- Testing PUT /api/mitra/harga-bahan/:id (Conflict Case) ---");
    // Create a second temporary BahanPokok and price
    const secondBahan = await prismaDb.bahanPokok.create({
      data: {
        nama: `Second Bahan Pokok Test ${Date.now()}`,
        satuan: "kg",
        tipePenyimpanan: "HABIS_HARI_ITU"
      }
    });
    const secondBahanId = secondBahan.id;

    const secondPriceRes = await fetch(`${baseUrl}/mitra/harga-bahan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        periodeId,
        bahanPokokId: secondBahanId,
        harga: 8000,
        isFallback: false
      })
    });
    const secondPriceData = await secondPriceRes.json();
    if (secondPriceRes.status !== 201) {
      throw new Error(`Failed to create second price: ${secondPriceRes.status}`);
    }

    // Now try to update the first price's bahanPokokId to secondBahanId (should conflict)
    const putConflictRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        bahanPokokId: secondBahanId
      })
    });
    const putConflictData = await putConflictRes.json();
    if (putConflictRes.status !== 409) {
      throw new Error(`Expected status 409 Conflict for PUT, but got ${putConflictRes.status}: ${JSON.stringify(putConflictData)}`);
    }
    console.log("PUT duplicate bahanPokokId correctly rejected with 409 Conflict:", putConflictData.error);

    // Clean up second price and second ingredient
    await fetch(`${baseUrl}/mitra/harga-bahan/${secondPriceData.id}`, { method: "DELETE", headers });
    await prismaDb.bahanPokok.delete({ where: { id: secondBahanId } });

    // 9b. Test PUT /api/mitra/harga-bahan/:id (PUT validation negative price)
    console.log("\n--- Testing PUT /api/mitra/harga-bahan/:id (Validation Case) ---");
    const putInvalidRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        harga: -100
      })
    });
    const putInvalidData = await putInvalidRes.json();
    if (putInvalidRes.status !== 400) {
      throw new Error(`Expected status 400 Bad Request for PUT, but got ${putInvalidRes.status}: ${JSON.stringify(putInvalidData)}`);
    }
    console.log("PUT negative price correctly rejected with 400 Bad Request:", putInvalidData.error);

    // 9c. Test PUT /api/mitra/harga-bahan/:id (PUT self-update)
    console.log("\n--- Testing PUT /api/mitra/harga-bahan/:id (Self-Update Case) ---");
    const putSelfRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        bahanPokokId: testBahanId, // same value
        harga: 14000.00
      })
    });
    const putSelfData = await putSelfRes.json();
    if (putSelfRes.status !== 200) {
      throw new Error(`Expected status 200 for PUT self-update, but got ${putSelfRes.status}: ${JSON.stringify(putSelfData)}`);
    }
    console.log("PUT self-update successful (no self-conflict). New price:", putSelfData.harga);

    // 10. Test DELETE /api/mitra/harga-bahan/:id
    console.log("\n--- Testing DELETE /api/mitra/harga-bahan/:id ---");
    const deleteRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, {
      method: "DELETE",
      headers
    });
    if (!deleteRes.ok) {
      throw new Error(`Failed DELETE /api/mitra/harga-bahan/:id: ${deleteRes.status}`);
    }
    console.log("DELETE /api/mitra/harga-bahan/:id successful.");

    // Verify deleted
    const verifyGetRes = await fetch(`${baseUrl}/mitra/harga-bahan/${testHargaBahanId}`, { headers });
    if (verifyGetRes.status !== 404) {
      throw new Error(`Expected 404 for deleted record, got ${verifyGetRes.status}`);
    }
    testHargaBahanId = null;
    console.log("Price deletion verified successfully.");

  } finally {
    // 11. Cleanup
    console.log("\n--- Cleaning up temporary test data ---");
    if (testHargaBahanId) {
      await prismaDb.hargaBahanPeriode.delete({ where: { id: testHargaBahanId } }).catch(() => {});
    }
    if (testBahanId) {
      await prismaDb.bahanPokok.delete({ where: { id: testBahanId } }).catch(() => {});
      console.log(`Deleted test BahanPokok ID: ${testBahanId}`);
    }
    await prismaDb.$disconnect();
  }

  console.log("\nALL MITRA API INTEGRATION TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
