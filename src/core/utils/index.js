// ============================================================
// src/core/utils/index.js
// Kumpulan utility functions yang digunakan di seluruh aplikasi
// ============================================================

// ── API Response Helper ──────────────────────────────────────

/**
 * Membuat response sukses yang konsisten untuk API routes
 *
 * @param {any} data - Data yang dikembalikan
 * @param {string} message - Pesan sukses
 * @param {object} meta - Metadata tambahan (pagination, dll)
 * @returns {object} Format response yang konsisten
 */
export function successResponse(data = null, message = "Berhasil", meta = {}) {
  return {
    success: true,
    message,
    data,
    ...meta, // Spread meta (total, page, limit untuk pagination)
    timestamp: new Date().toISOString(), // Timestamp untuk debugging
  };
}

/**
 * Membuat response error yang konsisten untuk API routes
 *
 * @param {string} message - Pesan error
 * @param {number} statusCode - HTTP status code
 * @param {any} errors - Detail error (opsional)
 * @returns {object} Format response error
 */
export function errorResponse(message = "Terjadi kesalahan", statusCode = 500, errors = null) {
  return {
    success: false,
    message,
    statusCode,
    ...(errors && { errors }), // Sertakan errors jika ada
    timestamp: new Date().toISOString(),
  };
}

// ── String Utilities ─────────────────────────────────────────

/**
 * Mengkonversi string menjadi URL-friendly slug
 * Contoh: "Berita Terbaru NU" -> "berita-terbaru-nu"
 *
 * @param {string} text - Teks yang akan dikonversi
 * @returns {string} Slug URL-friendly
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")        // Spasi -> tanda hubung
    .replace(/[^\w\-]+/g, "")    // Hapus karakter non-word
    .replace(/\-\-+/g, "-")      // Multiple tanda hubung -> satu
    .replace(/^-+/, "")          // Hapus tanda hubung di awal
    .replace(/-+$/, "");         // Hapus tanda hubung di akhir
}

/**
 * Memotong teks panjang menjadi excerpt/ringkasan
 * Contoh: untuk preview artikel di daftar berita
 *
 * @param {string} text - Teks yang akan dipotong
 * @param {number} maxLength - Panjang maksimum karakter
 * @returns {string} Teks yang sudah dipotong dengan "..."
 */
export function truncateText(text, maxLength = 150) {
  if (!text || text.length <= maxLength) return text;

  // Potong di batas kata, bukan di tengah kata
  const truncated = text.substring(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(" ");

  return lastSpace > 0
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
}

/**
 * Mengkapitalisasi huruf pertama setiap kata
 * Contoh: "nahdlatul ulama" -> "Nahdlatul Ulama"
 */
export function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ── Date Utilities ───────────────────────────────────────────

/**
 * Format tanggal ke format Indonesia
 * Contoh: 2024-01-15 -> "15 Januari 2024"
 *
 * @param {Date|string} date - Tanggal yang akan diformat
 * @param {object} options - Opsi format Intl.DateTimeFormat
 * @returns {string} Tanggal dalam format Indonesia
 */
export function formatDateID(date, options = {}) {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat("id-ID", defaultOptions).format(
    new Date(date)
  );
}

/**
 * Format tanggal relatif (berapa lama yang lalu)
 * Contoh: "3 hari yang lalu", "2 jam yang lalu"
 *
 * @param {Date|string} date - Tanggal yang akan diformat
 * @returns {string} Waktu relatif dalam Bahasa Indonesia
 */
export function relativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;             // Selisih dalam milliseconds
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Return format yang sesuai berdasarkan selisih waktu
  if (diffSecs < 60) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu yang lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan yang lalu`;

  return `${Math.floor(diffDays / 365)} tahun yang lalu`;
}

// ── Validation Utilities ─────────────────────────────────────

/**
 * Validasi format email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validasi kekuatan password
 * Minimal: 8 karakter, 1 huruf besar, 1 huruf kecil, 1 angka
 *
 * @param {string} password
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
  const errors = [];

  if (password.length < 8) errors.push("Minimal 8 karakter");
  if (!/[A-Z]/.test(password)) errors.push("Minimal 1 huruf kapital");
  if (!/[a-z]/.test(password)) errors.push("Minimal 1 huruf kecil");
  if (!/[0-9]/.test(password)) errors.push("Minimal 1 angka");

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ── Class Name Utilities ─────────────────────────────────────

/**
 * Menggabungkan class names dengan kondisi
 * Versi sederhana dari library 'clsx'
 *
 * @param {...string|object} args - Class names atau objek kondisi
 * @returns {string} Class names yang sudah digabung
 *
 * Contoh penggunaan:
 * cn("base-class", isActive && "active", { "error": hasError })
 */
export function cn(...args) {
  return args
    .filter(Boolean)
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (typeof arg === "object") {
        // Untuk objek: { "class-name": kondisi }
        return Object.entries(arg)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(" ");
      }
      return "";
    })
    .join(" ")
    .trim();
}

// ── Pagination Utilities ─────────────────────────────────────

/**
 * Menghitung metadata pagination
 * Digunakan untuk API endpoint yang return data dengan pagination
 *
 * @param {number} totalItems - Total semua item
 * @param {number} currentPage - Halaman saat ini (mulai dari 1)
 * @param {number} itemsPerPage - Jumlah item per halaman
 * @returns {object} Metadata pagination
 */
export function getPaginationMeta(totalItems, currentPage = 1, itemsPerPage = 10) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    total: totalItems,           // Total semua item
    page: currentPage,           // Halaman saat ini
    limit: itemsPerPage,         // Item per halaman
    totalPages,                  // Total halaman
    hasNextPage: currentPage < totalPages,     // Apakah ada halaman berikutnya
    hasPrevPage: currentPage > 1,             // Apakah ada halaman sebelumnya
    offset: (currentPage - 1) * itemsPerPage, // Offset untuk query database
  };
}
