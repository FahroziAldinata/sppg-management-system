const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// HELPERS / MASTER READ-ONLY ENDPOINTS
// ==========================================

// GET /api/aslap/periode - List all periods
router.get("/periode", requireAuth, requireRole("ASLAP", "MITRA", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.periode.findMany({
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data periode" });
  }
});

// GET /api/aslap/kategori - List all categories
router.get("/kategori", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.kategoriPenerima.findMany({
      orderBy: { urutan: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kategori" });
  }
});

// GET /api/aslap/sekolah - List all schools
router.get("/sekolah", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.sekolah.findMany({
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data sekolah" });
  }
});

// GET /api/aslap/posyandu - List all posyandus
router.get("/posyandu", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.posyandu.findMany({
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data posyandu" });
  }
});


// ==========================================
// CRUD INPUT PENERIMA MANFAAT
// ==========================================

// GET /api/aslap/penerima-manfaat - Get list of penerima manfaat
router.get("/penerima-manfaat", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.inputPenerimaManfaat.findMany({
      where: periodeId ? { periodeId } : undefined,
      include: {
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data penerima manfaat" });
  }
});

// GET /api/aslap/penerima-manfaat/:id - Get single penerima manfaat
router.get("/penerima-manfaat/:id", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.inputPenerimaManfaat.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data penerima manfaat tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data penerima manfaat" });
  }
});

// POST /api/aslap/penerima-manfaat - Create new penerima manfaat
router.post("/penerima-manfaat", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { periodeId, hariAktif, detail } = req.body || {};

    // 1. Basic validation
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!hariAktif || !Array.isArray(hariAktif) || hariAktif.length === 0) {
      return res.status(400).json({ error: "hariAktif wajib diisi dengan array hari yang tidak kosong" });
    }

    // Validate enum values in hariAktif
    const validDays = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    for (const day of hariAktif) {
      if (!validDays.includes(day)) {
        return res.status(400).json({ error: `Hari '${day}' tidak valid. Harus salah satu dari: ${validDays.join(", ")}` });
      }
    }

    if (!detail || !Array.isArray(detail) || detail.length === 0) {
      return res.status(400).json({ error: "detail penerima manfaat wajib diisi dengan array yang tidak kosong" });
    }

    // 2. Run validations and creation inside transaction to ensure atomicity
    const created = await prisma.$transaction(async (tx) => {
      // Lock Periode row to serialize overlap checks on this period
      // ponytail: lock whole period to serialize writes per period
      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;

      // A. Validate period exists
      const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!periodExists) {
        throw new Error(`[NOT_FOUND] Periode dengan ID ${periodeId} tidak ditemukan`);
      }

      // B. Validate overlap: hariAktif must not overlap with existing entries in the same period
      const existingInputs = await tx.inputPenerimaManfaat.findMany({
        where: { periodeId }
      });

      const intersection = hariAktif.filter(day =>
        existingInputs.some(ex => ex.hariAktif.includes(day))
      );

      if (intersection.length > 0) {
        throw new Error(`[VALIDASI] Hari aktif berikut sudah terisi pada input lain di periode ini: ${intersection.join(", ")}`);
      }

      // C. Validate all detail items (read-only checks first)
      const resolvedCategories = [];
      for (let i = 0; i < detail.length; i++) {
        const item = detail[i];
        const { kategoriId, sekolahId, sekolahNama, posyanduId, posyanduNama, lakiLaki, perempuan } = item;

        if (!kategoriId) {
          throw new Error(`[VALIDASI] Detail indeks ke-${i}: kategoriId wajib diisi`);
        }

        const kategori = await tx.kategoriPenerima.findUnique({ where: { id: kategoriId } });
        if (!kategori) {
          throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Kategori dengan ID ${kategoriId} tidak ditemukan`);
        }
        resolvedCategories[i] = kategori;

        const numLaki = parseInt(lakiLaki, 10);
        const numPerempuan = parseInt(perempuan, 10);
        if (isNaN(numLaki) || numLaki < 0) {
          throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah laki-laki harus berupa angka non-negatif`);
        }
        if (isNaN(numPerempuan) || numPerempuan < 0) {
          throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah perempuan harus berupa angka non-negatif`);
        }

        if (kategori.jenisSasaran === "PESERTA_DIDIK") {
          if (posyanduId || posyanduNama) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Kategori '${kategori.nama}' adalah peserta didik, tidak boleh mengisi posyanduId atau posyanduNama`);
          }
          if (sekolahId) {
            const exists = await tx.sekolah.findUnique({ where: { id: sekolahId } });
            if (!exists) {
              throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Sekolah dengan ID ${sekolahId} tidak ditemukan`);
            }
          } else if (sekolahNama) {
            const normalizedNama = sekolahNama.trim();
            if (!normalizedNama) {
              throw new Error(`[VALIDASI] Detail indeks ke-${i}: nama sekolah tidak boleh kosong`);
            }
          } else {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: sekolahId atau sekolahNama wajib diisi untuk kategori peserta didik`);
          }
        } else if (kategori.jenisSasaran === "NON_PESERTA_DIDIK") {
          if (sekolahId || sekolahNama) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Kategori '${kategori.nama}' adalah non-peserta didik, tidak boleh mengisi sekolahId atau sekolahNama`);
          }
          if (posyanduId) {
            const exists = await tx.posyandu.findUnique({ where: { id: posyanduId } });
            if (!exists) {
              throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Posyandu dengan ID ${posyanduId} tidak ditemukan`);
            }
          } else if (posyanduNama) {
            const normalizedNama = posyanduNama.trim();
            if (!normalizedNama) {
              throw new Error(`[VALIDASI] Detail indeks ke-${i}: nama posyandu tidak boleh kosong`);
            }
          } else {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: posyanduId atau posyanduNama wajib diisi untuk kategori non-peserta didik`);
          }
        }
      }

      // D. All validations passed, resolve ids and perform writes/creations
      const resolvedDetails = [];
      for (let i = 0; i < detail.length; i++) {
        const item = detail[i];
        const { kategoriId, sekolahId, sekolahNama, posyanduId, posyanduNama, lakiLaki, perempuan } = item;
        const kategori = resolvedCategories[i];

        let resolvedSekolahId = null;
        let resolvedPosyanduId = null;

        if (kategori.jenisSasaran === "PESERTA_DIDIK") {
          if (sekolahId) {
            resolvedSekolahId = sekolahId;
          } else if (sekolahNama) {
            const normalizedNama = sekolahNama.trim();
            let sekolahObj;
            try {
              sekolahObj = await tx.sekolah.create({
                data: { nama: normalizedNama }
              });
            } catch (err) {
              if (err.code === "P2002") {
                sekolahObj = await tx.sekolah.findUnique({
                  where: { nama: normalizedNama }
                });
                if (!sekolahObj) {
                  sekolahObj = await tx.sekolah.findFirst({
                    where: { nama: { equals: normalizedNama, mode: "insensitive" } }
                  });
                }
              } else {
                throw err;
              }
            }
            resolvedSekolahId = sekolahObj.id;
          }
        } else if (kategori.jenisSasaran === "NON_PESERTA_DIDIK") {
          if (posyanduId) {
            resolvedPosyanduId = posyanduId;
          } else if (posyanduNama) {
            const normalizedNama = posyanduNama.trim();
            let posyanduObj;
            try {
              posyanduObj = await tx.posyandu.create({
                data: { nama: normalizedNama }
              });
            } catch (err) {
              if (err.code === "P2002") {
                posyanduObj = await tx.posyandu.findUnique({
                  where: { nama: normalizedNama }
                });
                if (!posyanduObj) {
                  posyanduObj = await tx.posyandu.findFirst({
                    where: { nama: { equals: normalizedNama, mode: "insensitive" } }
                  });
                }
              } else {
                throw err;
              }
            }
            resolvedPosyanduId = posyanduObj.id;
          }
        }

        resolvedDetails.push({
          kategoriId,
          sekolahId: resolvedSekolahId,
          posyanduId: resolvedPosyanduId,
          lakiLaki: parseInt(lakiLaki, 10),
          perempuan: parseInt(perempuan, 10)
        });
      }

      // Create in database
      return await tx.inputPenerimaManfaat.create({
        data: {
          periodeId,
          hariAktif,
          createdById: req.user.sub,
          detail: {
            create: resolvedDetails
          }
        },
        include: {
          detail: {
            include: {
              kategori: true,
              sekolah: true,
              posyandu: true
            }
          }
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data penerima manfaat" });
  }
});

// PUT /api/aslap/penerima-manfaat/:id - Update existing penerima manfaat
router.put("/penerima-manfaat/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;
    const { hariAktif, detail } = req.body || {};

    // 1. Basic non-DB validation if provided
    if (hariAktif) {
      if (!Array.isArray(hariAktif) || hariAktif.length === 0) {
        return res.status(400).json({ error: "hariAktif wajib berupa array hari yang tidak kosong jika dikirim" });
      }
      const validDays = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
      for (const day of hariAktif) {
        if (!validDays.includes(day)) {
          return res.status(400).json({ error: `Hari '${day}' tidak valid. Harus salah satu dari: ${validDays.join(", ")}` });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 2. Check parent exists inside transaction
      const existingParent = await tx.inputPenerimaManfaat.findUnique({
        where: { id }
      });
      if (!existingParent) {
        throw new Error("[NOT_FOUND] Data penerima manfaat tidak ditemukan");
      }

      const { periodeId } = existingParent;

      // Lock Periode row to serialize overlap checks on this period
      // ponytail: lock whole period to serialize writes per period
      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;

      // 3. Validate overlap inside transaction
      if (hariAktif) {
        const existingInputs = await tx.inputPenerimaManfaat.findMany({
          where: {
            periodeId,
            NOT: { id }
          }
        });

        const intersection = hariAktif.filter(day =>
          existingInputs.some(ex => ex.hariAktif.includes(day))
        );

        if (intersection.length > 0) {
          throw new Error(`[VALIDASI] Hari aktif berikut sudah terisi pada input lain di periode ini: ${intersection.join(", ")}`);
        }
      }

      let resolvedDetails = null;
      if (detail) {
        if (!Array.isArray(detail)) {
          throw new Error("[VALIDASI] detail harus berupa array");
        }

        // C1. Validate all detail items (read-only checks first)
        const resolvedCategories = [];
        for (let i = 0; i < detail.length; i++) {
          const item = detail[i];
          const { kategoriId, sekolahId, sekolahNama, posyanduId, posyanduNama, lakiLaki, perempuan } = item;

          if (!kategoriId) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: kategoriId wajib diisi`);
          }

          const kategori = await tx.kategoriPenerima.findUnique({ where: { id: kategoriId } });
          if (!kategori) {
            throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Kategori dengan ID ${kategoriId} tidak ditemukan`);
          }
          resolvedCategories[i] = kategori;

          const numLaki = parseInt(lakiLaki, 10);
          const numPerempuan = parseInt(perempuan, 10);
          if (isNaN(numLaki) || numLaki < 0) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah laki-laki harus berupa angka non-negatif`);
          }
          if (isNaN(numPerempuan) || numPerempuan < 0) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah perempuan harus berupa angka non-negatif`);
          }

          if (kategori.jenisSasaran === "PESERTA_DIDIK") {
            if (posyanduId || posyanduNama) {
              throw new Error(`[VALIDASI] Detail indeks ke-${i}: Kategori '${kategori.nama}' adalah peserta didik, tidak boleh mengisi posyanduId atau posyanduNama`);
            }
            if (sekolahId) {
              const exists = await tx.sekolah.findUnique({ where: { id: sekolahId } });
              if (!exists) {
                throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Sekolah dengan ID ${sekolahId} tidak ditemukan`);
              }
            } else if (sekolahNama) {
              const normalizedNama = sekolahNama.trim();
              if (!normalizedNama) {
                throw new Error(`[VALIDASI] Detail indeks ke-${i}: nama sekolah tidak boleh kosong`);
              }
            } else {
              throw new Error(`[VALIDASI] Detail indeks ke-${i}: sekolahId atau sekolahNama wajib diisi untuk kategori peserta didik`);
            }
          } else if (kategori.jenisSasaran === "NON_PESERTA_DIDIK") {
            if (sekolahId || sekolahNama) {
              throw new Error(`[VALIDASI] Detail indeks ke-${i}: Kategori '${kategori.nama}' adalah non-peserta didik, tidak boleh mengisi sekolahId atau sekolahNama`);
            }
            if (posyanduId) {
              const exists = await tx.posyandu.findUnique({ where: { id: posyanduId } });
              if (!exists) {
                throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Posyandu dengan ID ${posyanduId} tidak ditemukan`);
              }
            } else if (posyanduNama) {
              const normalizedNama = posyanduNama.trim();
              if (!normalizedNama) {
                throw new Error(`[VALIDASI] Detail indeks ke-${i}: nama posyandu tidak boleh kosong`);
              }
            } else {
              throw new Error(`[VALIDASI] Detail indeks ke-${i}: posyanduId atau posyanduNama wajib diisi untuk kategori non-peserta didik`);
            }
          }
        }

        // C2. All validations passed, resolve ids and perform writes/creations
        resolvedDetails = [];
        for (let i = 0; i < detail.length; i++) {
          const item = detail[i];
          const { kategoriId, sekolahId, sekolahNama, posyanduId, posyanduNama, lakiLaki, perempuan } = item;
          const kategori = resolvedCategories[i];

          let resolvedSekolahId = null;
          let resolvedPosyanduId = null;

          if (kategori.jenisSasaran === "PESERTA_DIDIK") {
            if (sekolahId) {
              resolvedSekolahId = sekolahId;
            } else if (sekolahNama) {
              const normalizedNama = sekolahNama.trim();
              let sekolahObj;
              try {
                sekolahObj = await tx.sekolah.create({
                  data: { nama: normalizedNama }
                });
              } catch (err) {
                if (err.code === "P2002") {
                  sekolahObj = await tx.sekolah.findUnique({
                    where: { nama: normalizedNama }
                  });
                  if (!sekolahObj) {
                    sekolahObj = await tx.sekolah.findFirst({
                      where: { nama: { equals: normalizedNama, mode: "insensitive" } }
                    });
                  }
                } else {
                  throw err;
                }
              }
              resolvedSekolahId = sekolahObj.id;
            }
          } else if (kategori.jenisSasaran === "NON_PESERTA_DIDIK") {
            if (posyanduId) {
              resolvedPosyanduId = posyanduId;
            } else if (posyanduNama) {
              const normalizedNama = posyanduNama.trim();
              let posyanduObj;
              try {
                posyanduObj = await tx.posyandu.create({
                  data: { nama: normalizedNama }
                });
              } catch (err) {
                if (err.code === "P2002") {
                  posyanduObj = await tx.posyandu.findUnique({
                    where: { nama: normalizedNama }
                  });
                  if (!posyanduObj) {
                    posyanduObj = await tx.posyandu.findFirst({
                      where: { nama: { equals: normalizedNama, mode: "insensitive" } }
                    });
                  }
                } else {
                  throw err;
                }
              }
              resolvedPosyanduId = posyanduObj.id;
            }
          }

          resolvedDetails.push({
            kategoriId,
            sekolahId: resolvedSekolahId,
            posyanduId: resolvedPosyanduId,
            lakiLaki: parseInt(lakiLaki, 10),
            perempuan: parseInt(perempuan, 10)
          });
        }
      }

      // If details are provided, recreate them
      if (resolvedDetails !== null) {
        // Delete all existing details
        await tx.inputPenerimaManfaatDetail.deleteMany({
          where: { inputPenerimaManfaatId: id }
        });
      }

      return await tx.inputPenerimaManfaat.update({
        where: { id },
        data: {
          hariAktif: hariAktif || undefined,
          detail: resolvedDetails !== null ? {
            create: resolvedDetails
          } : undefined
        },
        include: {
          detail: {
            include: {
              kategori: true,
              sekolah: true,
              posyandu: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data penerima manfaat" });
  }
});

// DELETE /api/aslap/penerima-manfaat/:id - Delete penerima manfaat
router.delete("/penerima-manfaat/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.inputPenerimaManfaat.findUnique({
      where: { id }
    });
    if (!exists) {
      return res.status(404).json({ error: "Data penerima manfaat tidak ditemukan" });
    }

    // Cascade delete is defined in schema (onDelete: Cascade on InputPenerimaManfaatDetail)
    await prisma.inputPenerimaManfaat.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data penerima manfaat beserta detailnya berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data penerima manfaat" });
  }
});


// ==========================================
// CRUD SEKOLAH KELAS DETAIL
// ==========================================

// GET /api/aslap/sekolah-kelas-detail - Get list of sekolah kelas detail
router.get("/sekolah-kelas-detail", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, sekolahId } = req.query;
    const data = await prisma.sekolahKelasDetail.findMany({
      where: {
        periodeId: periodeId || undefined,
        sekolahId: sekolahId || undefined
      },
      include: {
        sekolah: true
      },
      orderBy: [
        { sekolahId: "asc" },
        { namaKelas: "asc" }
      ]
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kelas detail" });
  }
});

// GET /api/aslap/sekolah-kelas-detail/:id - Get single sekolah kelas detail
router.get("/sekolah-kelas-detail/:id", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.sekolahKelasDetail.findUnique({
      where: { id },
      include: {
        sekolah: true
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data detail kelas sekolah tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data detail kelas sekolah" });
  }
});

// POST /api/aslap/sekolah-kelas-detail - Create new sekolah kelas detail
router.post("/sekolah-kelas-detail", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { periodeId, sekolahId, sekolahNama, namaKelas, jumlah } = req.body || {};

    // 1. Basic validation
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!namaKelas || typeof namaKelas !== "string" || !namaKelas.trim()) {
      return res.status(400).json({ error: "namaKelas wajib diisi" });
    }
    const numJumlah = parseInt(jumlah, 10);
    if (isNaN(numJumlah) || numJumlah < 0) {
      return res.status(400).json({ error: "jumlah harus berupa angka non-negatif" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 2. Validate period
      const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!periodExists) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 3. Resolve sekolahId
      let resolvedSekolahId = null;
      if (sekolahId) {
        const exists = await tx.sekolah.findUnique({ where: { id: sekolahId } });
        if (!exists) {
          throw new Error("[NOT_FOUND] Sekolah tidak ditemukan");
        }
        resolvedSekolahId = sekolahId;
      } else if (sekolahNama) {
        const normalizedNama = sekolahNama.trim();
        if (!normalizedNama) {
          throw new Error("[VALIDASI] nama sekolah tidak boleh kosong");
        }
        let sekolahObj = await tx.sekolah.findFirst({
          where: { nama: { equals: normalizedNama, mode: "insensitive" } }
        });
        if (!sekolahObj) {
          sekolahObj = await tx.sekolah.create({
            data: { nama: normalizedNama }
          });
        }
        resolvedSekolahId = sekolahObj.id;
      } else {
        throw new Error("[VALIDASI] sekolahId atau sekolahNama wajib diisi");
      }

      // 4. Validate unique constraint: [periodeId, sekolahId, namaKelas]
      const existing = await tx.sekolahKelasDetail.findUnique({
        where: {
          periodeId_sekolahId_namaKelas: {
            periodeId,
            sekolahId: resolvedSekolahId,
            namaKelas: namaKelas.trim()
          }
        }
      });

      if (existing) {
        throw new Error(`[CONFLICT] Detail kelas '${namaKelas}' untuk sekolah ini pada periode terpilih sudah terdaftar`);
      }

      // 5. Create in database
      return await tx.sekolahKelasDetail.create({
        data: {
          periodeId,
          sekolahId: resolvedSekolahId,
          namaKelas: namaKelas.trim(),
          jumlah: numJumlah
        },
        include: {
          sekolah: true
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan detail kelas sekolah" });
  }
});

// PUT /api/aslap/sekolah-kelas-detail/:id - Update existing sekolah kelas detail
router.put("/sekolah-kelas-detail/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodeId, sekolahId, sekolahNama, namaKelas, jumlah } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Check exists
      const existingRecord = await tx.sekolahKelasDetail.findUnique({
        where: { id }
      });
      if (!existingRecord) {
        throw new Error("[NOT_FOUND] Data detail kelas sekolah tidak ditemukan");
      }

      // Determine target values
      const targetPeriodeId = periodeId || existingRecord.periodeId;
      const targetNamaKelas = namaKelas !== undefined ? namaKelas.trim() : existingRecord.namaKelas;
      const targetJumlah = jumlah !== undefined ? parseInt(jumlah, 10) : existingRecord.jumlah;

      if (!targetNamaKelas) {
        throw new Error("[VALIDASI] namaKelas tidak boleh kosong");
      }
      if (isNaN(targetJumlah) || targetJumlah < 0) {
        throw new Error("[VALIDASI] jumlah harus berupa angka non-negatif");
      }

      // Validate target period
      if (periodeId && periodeId !== existingRecord.periodeId) {
        const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
        if (!periodExists) {
          throw new Error("[NOT_FOUND] Periode tidak ditemukan");
        }
      }

      // Resolve target sekolahId
      let targetSekolahId = existingRecord.sekolahId;
      if (sekolahId || sekolahNama) {
        if (sekolahId) {
          const exists = await tx.sekolah.findUnique({ where: { id: sekolahId } });
          if (!exists) {
            throw new Error("[NOT_FOUND] Sekolah tidak ditemukan");
          }
          targetSekolahId = sekolahId;
        } else if (sekolahNama) {
          const normalizedNama = sekolahNama.trim();
          if (!normalizedNama) {
            throw new Error("[VALIDASI] nama sekolah tidak boleh kosong");
          }
          let sekolahObj = await tx.sekolah.findFirst({
            where: { nama: { equals: normalizedNama, mode: "insensitive" } }
          });
          if (!sekolahObj) {
            sekolahObj = await tx.sekolah.create({
              data: { nama: normalizedNama }
            });
          }
          targetSekolahId = sekolahObj.id;
        }
      }

      // Check unique constraint excluding this record itself
      const conflict = await tx.sekolahKelasDetail.findFirst({
        where: {
          periodeId: targetPeriodeId,
          sekolahId: targetSekolahId,
          namaKelas: targetNamaKelas,
          NOT: { id }
        }
      });

      if (conflict) {
        throw new Error(`[CONFLICT] Detail kelas '${targetNamaKelas}' untuk sekolah ini pada periode tersebut sudah terdaftar`);
      }

      // Update
      return await tx.sekolahKelasDetail.update({
        where: { id },
        data: {
          periodeId: targetPeriodeId,
          sekolahId: targetSekolahId,
          namaKelas: targetNamaKelas,
          jumlah: targetJumlah
        },
        include: {
          sekolah: true
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui detail kelas sekolah" });
  }
});

// DELETE /api/aslap/sekolah-kelas-detail/:id - Delete sekolah kelas detail
router.delete("/sekolah-kelas-detail/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.sekolahKelasDetail.findUnique({
      where: { id }
    });
    if (!exists) {
      return res.status(404).json({ error: "Data detail kelas sekolah tidak ditemukan" });
    }

    await prisma.sekolahKelasDetail.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data detail kelas sekolah berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus detail kelas sekolah" });
  }
});

module.exports = router;
