/*
  Warnings:

  - Added the required column `jenjang` to the `Sekolah` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JenjangSekolah" AS ENUM ('TK', 'SD', 'SMP', 'SMA_SMK');

-- AlterTable
ALTER TABLE "Sekolah" ADD COLUMN     "jenjang" "JenjangSekolah" NOT NULL DEFAULT 'SD';
