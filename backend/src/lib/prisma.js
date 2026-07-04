const { PrismaClient } = require("@prisma/client");

// Singleton biar gak bikin banyak koneksi tiap import (umum di Express + Prisma)
const prisma = new PrismaClient();

module.exports = prisma;