// ============================================================
// src/core/qrcode/qrGenerator.js
// QR Code Generator — Core Layer
//
// Membuat QR Code sebagai SVG / base64 PNG menggunakan
// library "qrcode" (pure JS, tanpa canvas dependency).
//
// Install: npm install qrcode
//
// Format kode warga: UPZ-XXXX
//   UPZ  = Unit Pengumpul Zakat (identitas program NU)
//   XXXX = nomor kencleng 4 digit dengan zero-padding
//
// Contoh: UPZ-0001, UPZ-0042, UPZ-9999
// ============================================================

import QRCode from "qrcode"; // Library qrcode — generate QR ke SVG/PNG/DataURL

// ── Konstanta format kode ────────────────────────────────────

/** Prefix unik untuk semua kode kencleng NU */
const QR_PREFIX = "UPZ";

/** Panjang angka setelah prefix (zero-padded) */
const CODE_NUMBER_LENGTH = 4;

/** Regex validasi format kode: UPZ-XXXX */
const QR_CODE_REGEX = /^UPZ-\d{4}$/;

// ── Konfigurasi visual QR Code ────────────────────────────────
const QR_OPTIONS = {
  errorCorrectionLevel: "M", // Level koreksi error:
  // L=7%, M=15%, Q=25%, H=30%
  // M = keseimbangan ukuran vs ketahanan baca

  type: "image/png", // Output tipe file
  quality: 0.92, // Kualitas PNG (0–1)
  margin: 2, // Margin putih di sekeliling QR (dalam "module" unit)
  width: 256, // Lebar output dalam pixel

  color: {
    dark: "#1a7a3c", // Warna modul QR = hijau NU gelap
    light: "#ffffff", // Warna background = putih
  },
};

// ── Fungsi Utama: Generate Kode ──────────────────────────────

/**
 * generateQrCode — Membuat kode unik + gambar QR Code
 *
 * Menerima no_kencleng (angka/string) dan menghasilkan:
 * 1. qrCode: string kode teks (e.g., "UPZ-0042")
 * 2. qrImage: Data URL base64 PNG siap disimpan ke DB / ditampilkan di <img>
 *
 * @param {string|number} noKencleng - Nomor kencleng warga
 * @returns {Promise<{ qrCode: string, qrImage: string }>}
 *
 * @example
 * const { qrCode, qrImage } = await generateQrCode("42");
 * // qrCode  → "UPZ-0042"
 * // qrImage → "data:image/png;base64,iVBORw0KGgoAAAA..."
 */
export async function generateQrCode(noKencleng) {
  // ── 1. Bentuk string kode canonical ──────────────────────
  const qrCode = formatQrCode(noKencleng);

  // ── 2. Buat gambar QR sebagai Data URL (base64 PNG) ───────
  // qrcode.toDataURL() mengembalikan string:
  // "data:image/png;base64,<base64-encoded-PNG>"
  const qrImage = await QRCode.toDataURL(qrCode, QR_OPTIONS);

  return { qrCode, qrImage };
}

/**
 * generateQrCodeSvg — Membuat QR Code dalam format SVG string
 *
 * SVG lebih ringan dari PNG dan bisa di-scale tanpa blur.
 * Berguna untuk tampilan web dan print.
 *
 * @param {string|number} noKencleng
 * @returns {Promise<{ qrCode: string, qrSvg: string }>}
 */
export async function generateQrCodeSvg(noKencleng) {
  const qrCode = formatQrCode(noKencleng);

  // qrcode.toString() dengan type "svg" menghasilkan string XML SVG
  const qrSvg = await QRCode.toString(qrCode, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#1a7a3c", // Hijau NU
      light: "#ffffff",
    },
  });

  return { qrCode, qrSvg };
}

/**
 * generateBatchQrCodes — Generate QR untuk banyak warga sekaligus
 *
 * Menggunakan Promise.allSettled agar satu kegagalan tidak
 * membatalkan seluruh batch.
 *
 * @param {Array<{ id: string, noKencleng: string }>} items
 * @returns {Promise<Array<{ id, qrCode, qrImage, error }>>}
 *
 * @example
 * const results = await generateBatchQrCodes([
 *   { id: "abc", noKencleng: "1" },
 *   { id: "def", noKencleng: "2" },
 * ]);
 */
export async function generateBatchQrCodes(items) {
  // Buat semua QR secara paralel (lebih cepat dari sequential)
  const results = await Promise.allSettled(
    items.map(async (item) => {
      const { qrCode, qrImage } = await generateQrCode(item.noKencleng);
      return { id: item.id, noKencleng: item.noKencleng, qrCode, qrImage };
    }),
  );

  // Petakan hasil: fulfilled → data, rejected → error info
  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      id: items[index].id,
      noKencleng: items[index].noKencleng,
      qrCode: null,
      qrImage: null,
      error: result.reason?.message || "Gagal generate QR",
    };
  });
}

// ── Fungsi Format & Validasi ─────────────────────────────────

/**
 * formatQrCode — Membentuk string kode standar dari nomor kencleng
 *
 * Aturan:
 * - Hapus karakter non-digit dari input
 * - Zero-pad ke panjang CODE_NUMBER_LENGTH (default 4 digit)
 * - Gabungkan: QR_PREFIX + "-" + nomor
 *
 * @param {string|number} noKencleng
 * @returns {string} Kode canonical, e.g. "UPZ-0042"
 *
 * @example
 * formatQrCode("42")   → "UPZ-0042"
 * formatQrCode(5)      → "UPZ-0005"
 * formatQrCode("0100") → "UPZ-0100"
 */
export function formatQrCode(noKencleng) {
  // Ambil hanya digit dari input (hapus spasi, tanda hubung, dll)
  const digits = String(noKencleng).replace(/\D/g, "");

  if (!digits) {
    throw new Error(`no_kencleng tidak valid: "${noKencleng}"`);
  }

  // Zero-pad dari kiri hingga CODE_NUMBER_LENGTH digit
  const padded = digits.padStart(CODE_NUMBER_LENGTH, "0");

  return `${QR_PREFIX}-${padded}`;
}

/**
 * parseQrCode — Mengekstrak nomor dari kode QR
 *
 * Kebalikan dari formatQrCode.
 *
 * @param {string} qrCode - Kode QR, e.g. "UPZ-0042"
 * @returns {string} Nomor saja, e.g. "0042"
 *
 * @example
 * parseQrCode("UPZ-0042") → "0042"
 */
export function parseQrCode(qrCode) {
  if (!isValidQrCode(qrCode)) {
    throw new Error(`Format QR Code tidak valid: "${qrCode}"`);
  }
  // Ambil bagian setelah tanda hubung
  return qrCode.split("-")[1];
}

/**
 * isValidQrCode — Memvalidasi format kode QR
 *
 * Format valid: UPZ-XXXX (X = digit 0-9)
 *
 * @param {string} qrCode
 * @returns {boolean}
 *
 * @example
 * isValidQrCode("UPZ-0042") → true
 * isValidQrCode("UPZ-42")   → false (kurang digit)
 * isValidQrCode("ABC-0042") → false (prefix salah)
 */
export function isValidQrCode(qrCode) {
  return QR_CODE_REGEX.test(String(qrCode));
}

/**
 * generateNoKenclengFromSequence — Buat nomor kencleng dari urutan angka
 *
 * Berguna saat import Excel untuk auto-generate nomor
 * bagi baris yang tidak punya nomor kencleng.
 *
 * @param {number} sequence - Urutan (mulai dari 1)
 * @param {number} [startFrom=1] - Offset awal (jika ada data existing)
 * @returns {string} Nomor kencleng, e.g. "0042"
 */
export function generateNoKenclengFromSequence(sequence, startFrom = 1) {
  const number = startFrom + sequence - 1;
  return String(number).padStart(CODE_NUMBER_LENGTH, "0");
}
