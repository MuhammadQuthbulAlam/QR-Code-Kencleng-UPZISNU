// ============================================================
// src/core/errors/AppError.js
// Base error classes untuk Clean Architecture
//
// Semua error dalam aplikasi harus extend dari class ini
// agar error handling konsisten di seluruh layer
// ============================================================

// ── Base Application Error ───────────────────────────────────
/**
 * Base class untuk semua error custom dalam aplikasi
 * Extend dari Error native JavaScript tapi tambahkan:
 * - statusCode: HTTP status code yang sesuai
 * - isOperational: apakah error ini "diharapkan" atau tidak
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    // Panggil constructor parent (Error)
    super(message);

    // HTTP status code (400, 401, 403, 404, 500, dll)
    this.statusCode = statusCode;

    // isOperational: true = error yang diharapkan (user input salah, dll)
    //                false = bug tidak terduga yang perlu di-investigate
    this.isOperational = isOperational;

    // Nama error class untuk identifikasi
    this.name = this.constructor.name;

    // Capture stack trace untuk debugging (exclude constructor dari stack)
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Domain-specific Error Classes ────────────────────────────

/**
 * 400 Bad Request
 * Untuk input yang tidak valid atau request yang malformed
 * Contoh: format email salah, field wajib kosong
 */
export class ValidationError extends AppError {
  constructor(message = "Data yang dikirim tidak valid", errors = []) {
    super(message, 400);
    // Array detail error validasi (field, pesan error per field)
    this.errors = errors;
  }
}

/**
 * 401 Unauthorized
 * User belum login atau token tidak valid
 * Contoh: akses halaman dashboard tanpa login
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Anda harus login terlebih dahulu") {
    super(message, 401);
  }
}

/**
 * 403 Forbidden
 * User sudah login tapi tidak punya izin akses
 * Contoh: member biasa coba akses halaman admin
 */
export class ForbiddenError extends AppError {
  constructor(message = "Anda tidak memiliki izin untuk mengakses resource ini") {
    super(message, 403);
  }
}

/**
 * 404 Not Found
 * Resource yang dicari tidak ditemukan
 * Contoh: artikel dengan ID tidak ada, user tidak ditemukan
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", message = null) {
    super(message || `${resource} tidak ditemukan`, 404);
    this.resource = resource;
  }
}

/**
 * 409 Conflict
 * Data sudah ada dan duplikasi tidak diizinkan
 * Contoh: email sudah terdaftar, slug sudah dipakai
 */
export class ConflictError extends AppError {
  constructor(message = "Data sudah ada, duplikasi tidak diizinkan") {
    super(message, 409);
  }
}

/**
 * 422 Unprocessable Entity
 * Request bisa diparsing tapi secara bisnis tidak bisa diproses
 * Contoh: user coba hapus akun yang masih punya konten aktif
 */
export class BusinessRuleError extends AppError {
  constructor(message) {
    super(message, 422);
  }
}

/**
 * 500 Internal Server Error
 * Error teknis yang tidak diharapkan (bug)
 * isOperational = false karena ini perlu di-investigate
 */
export class InternalServerError extends AppError {
  constructor(message = "Terjadi kesalahan pada server, silakan coba lagi") {
    super(message, 500, false); // isOperational = false!
  }
}

// ── Error Handler Utility ────────────────────────────────────

/**
 * Mengkonversi error menjadi response format yang konsisten
 * Digunakan di API route handlers
 *
 * @param {Error} error - Error yang ditangkap
 * @returns {{ status: number, body: object }} Format response
 */
export function formatErrorResponse(error) {
  // Jika ini AppError yang kita buat sendiri
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        message: error.message,
        // Sertakan detail error validasi jika ada
        ...(error instanceof ValidationError && { errors: error.errors }),
      },
    };
  }

  // Untuk error yang tidak dikenal (database error, dll)
  console.error("Unhandled error:", error);
  return {
    status: 500,
    body: {
      success: false,
      message: "Terjadi kesalahan pada server",
    },
  };
}
