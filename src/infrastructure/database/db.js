// ============================================================
// src/infrastructure/database/db.js
// Singleton koneksi Prisma Client ke PostgreSQL
//
// Menggunakan pola Singleton untuk mencegah pembuatan koneksi
// baru setiap kali modul di-import (terutama penting di
// development mode karena Next.js hot-reload)
// ============================================================

import { PrismaClient } from "@prisma/client";

// ── Konfigurasi log level berdasarkan environment ────────────
// Di development: tampilkan query, error, dan warning
// Di production: hanya tampilkan error
const prismaClientConfig = {
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"] // Verbose logging untuk debugging
      : ["error"],                  // Minimal logging untuk production
};

// ── Implementasi Singleton Pattern ──────────────────────────
// Deklarasi variabel global untuk menyimpan instance Prisma
// Menggunakan globalThis agar persist di antara hot-reload Next.js

/**
 * Mengambil atau membuat instance PrismaClient (Singleton)
 *
 * Di development: instance disimpan di globalThis.prisma
 * agar tidak membuat koneksi baru setiap hot-reload
 *
 * Di production: selalu buat instance baru (tidak ada hot-reload)
 */
function createPrismaClient() {
  // Jika sudah ada instance di global (development), gunakan itu
  if (globalThis.prisma) {
    return globalThis.prisma;
  }

  // Buat instance baru
  const client = new PrismaClient(prismaClientConfig);

  // Simpan di global hanya di development
  if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = client;
  }

  return client;
}

// ── Export instance tunggal ──────────────────────────────────
// Semua modul yang import db akan mendapatkan instance yang sama
export const db = createPrismaClient();

// ── Utility: Test koneksi database ──────────────────────────
/**
 * Menguji apakah koneksi ke database berhasil
 * Berguna untuk health check endpoint
 *
 * @returns {Promise<boolean>} true jika terhubung, false jika gagal
 */
export async function testDatabaseConnection() {
  try {
    // Jalankan query sederhana untuk test koneksi
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("❌ Koneksi database gagal:", error);
    return false;
  }
}

// ── Utility: Disconnect database ────────────────────────────
/**
 * Menutup koneksi database dengan graceful
 * Dipanggil saat aplikasi shutdown
 */
export async function disconnectDatabase() {
  await db.$disconnect();
  console.log("🔌 Koneksi database ditutup");
}
