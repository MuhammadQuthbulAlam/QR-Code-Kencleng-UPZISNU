// ============================================================
// src/core/jwt/jwtHelper.js
// JWT Helper — Core Layer
//
// Berisi semua logika untuk membuat, memverifikasi,
// dan mendecode JWT token secara MURNI (tanpa framework).
//
// Menggunakan Web Crypto API (built-in Node.js 18+) agar
// TIDAK membutuhkan library jose/jsonwebtoken eksternal.
// Ini membuat token kompatibel dengan Edge Runtime Next.js.
//
// Algoritma: HS256 (HMAC-SHA256)
// ============================================================

// ── Konstanta konfigurasi token ──────────────────────────────
const ALGORITHM = { name: "HMAC", hash: "SHA-256" }; // Algoritma HMAC-SHA256

/**
 * Durasi validitas token dalam detik
 * ACCESS TOKEN: pendek → lebih aman (kalau dicuri, cepat expired)
 * REFRESH TOKEN: panjang → kenyamanan user agar tidak sering re-login
 */
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_TTL: 60 * 60, // 1 jam (dalam detik)
  REFRESH_TOKEN_TTL: 60 * 60 * 24 * 7, // 7 hari (dalam detik)
};

// ── Encoder/Decoder untuk Base64Url ─────────────────────────
// JWT menggunakan Base64Url (bukan Base64 biasa):
// - Tidak ada padding "="
// - "+" diganti "-", "/" diganti "_"

/**
 * Mengkonversi string ke Base64Url
 * @param {string} str
 * @returns {string}
 */
function toBase64Url(str) {
  return btoa(str) // Encode ke Base64 standard
    .replace(/\+/g, "-") // Ganti + → -
    .replace(/\//g, "_") // Ganti / → _
    .replace(/=+$/, ""); // Hapus padding =
}

/**
 * Mendecode Base64Url kembali ke string
 * @param {string} base64url
 * @returns {string}
 */
function fromBase64Url(base64url) {
  // Kembalikan ke Base64 standard sebelum decode
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), "="); // Tambah padding

  return atob(base64);
}

// ── Crypto Key Helper ────────────────────────────────────────

/**
 * Mengimpor secret key ke format CryptoKey yang bisa dipakai
 * oleh Web Crypto API untuk signing/verifying.
 *
 * @param {string} secret - String rahasia dari environment variable
 * @param {"sign"|"verify"} usage - Kegunaan key
 * @returns {Promise<CryptoKey>}
 */
async function importKey(secret, usage) {
  // Konversi string secret → Uint8Array (format yang dibutuhkan Crypto API)
  const keyData = new TextEncoder().encode(secret);

  return crypto.subtle.importKey(
    "raw", // Format key: raw bytes
    keyData, // Data key
    ALGORITHM, // Algoritma: HMAC-SHA256
    false, // extractable: false → key tidak bisa di-export kembali (keamanan)
    [usage], // Kegunaan: ["sign"] atau ["verify"]
  );
}

// ── FUNGSI UTAMA ─────────────────────────────────────────────

/**
 * ✍️ signToken — Membuat JWT token baru
 *
 * Struktur JWT: header.payload.signature
 * - Header: metadata token (algoritma, tipe)
 * - Payload: data yang disimpan dalam token (claims)
 * - Signature: HMAC-SHA256(base64url(header) + "." + base64url(payload), secret)
 *
 * @param {object} payload - Data yang akan dimasukkan ke token
 * @param {string} secret - Secret key untuk signing
 * @param {number} expiresIn - Durasi validitas dalam detik
 * @returns {Promise<string>} JWT token string
 *
 * @example
 * const token = await signToken(
 *   { id: "user-123", role: "super_admin" },
 *   process.env.JWT_SECRET,
 *   3600  // 1 jam
 * );
 */
export async function signToken(
  payload,
  secret,
  expiresIn = TOKEN_CONFIG.ACCESS_TOKEN_TTL,
) {
  const now = Math.floor(Date.now() / 1000); // Waktu sekarang dalam Unix timestamp (detik)

  // ── 1. Buat header JWT ──────────────────────────────────────
  const header = {
    alg: "HS256", // Algoritma: HMAC with SHA-256
    typ: "JWT", // Tipe token
  };

  // ── 2. Buat payload dengan standard JWT claims ──────────────
  const fullPayload = {
    ...payload, // Data custom (id, role, email, dll)
    iat: now, // iat (issued at): waktu token dibuat
    exp: now + expiresIn, // exp (expiration): waktu token expired
    nbf: now, // nbf (not before): token valid mulai sekarang
  };

  // ── 3. Encode header dan payload ke Base64Url ───────────────
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));

  // ── 4. Buat signing input: "encodedHeader.encodedPayload" ───
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // ── 5. Generate tanda tangan (signature) ────────────────────
  const key = await importKey(secret, "sign");

  // Signature = HMAC-SHA256(signingInput, secret)
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput), // Input harus dalam bentuk bytes
  );

  // Konversi signature dari ArrayBuffer → Base64Url string
  const signature = toBase64Url(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  );

  // ── 6. Gabungkan: header.payload.signature ──────────────────
  return `${signingInput}.${signature}`;
}

/**
 * 🔍 verifyToken — Memverifikasi JWT token dan mengambil payload
 *
 * Proses verifikasi:
 * 1. Split token menjadi 3 bagian
 * 2. Verifikasi signature (apakah token asli/tidak dimodifikasi)
 * 3. Verifikasi expiration (apakah token masih berlaku)
 * 4. Return payload jika semua valid
 *
 * @param {string} token - JWT token string
 * @param {string} secret - Secret key yang sama dengan yang dipakai sign
 * @returns {Promise<object>} Payload yang ter-decode
 * @throws {Error} Jika token invalid atau expired
 *
 * @example
 * const payload = await verifyToken(token, process.env.JWT_SECRET);
 * console.log(payload.role); // "super_admin"
 */
export async function verifyToken(token, secret) {
  // ── 1. Split token jadi 3 bagian ────────────────────────────
  const parts = token.split(".");

  if (parts.length !== 3) {
    // Token harus terdiri dari TEPAT 3 bagian dipisahkan titik
    throw new Error("Format token tidak valid");
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;

  // ── 2. Verifikasi signature ──────────────────────────────────
  // Re-compute signature dari header + payload menggunakan secret
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await importKey(secret, "verify");

  // Decode received signature dari Base64Url → ArrayBuffer
  const signatureBytes = Uint8Array.from(
    fromBase64Url(receivedSignature),
    (c) => c.charCodeAt(0),
  );

  // crypto.subtle.verify akan return false jika signature tidak cocok
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(signingInput),
  );

  if (!isValid) {
    // Signature tidak cocok → token dimodifikasi atau secret salah
    throw new Error(
      "Tanda tangan token tidak valid — token mungkin telah dimanipulasi",
    );
  }

  // ── 3. Decode payload ────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    throw new Error("Payload token tidak dapat didecode");
  }

  // ── 4. Verifikasi expiration ─────────────────────────────────
  const now = Math.floor(Date.now() / 1000); // Waktu sekarang (detik)

  if (payload.exp && payload.exp < now) {
    // Token sudah expired
    const expiredAt = new Date(payload.exp * 1000).toLocaleString("id-ID");
    throw new Error(`Token sudah kedaluwarsa sejak ${expiredAt}`);
  }

  // ── 5. Verifikasi not-before ─────────────────────────────────
  if (payload.nbf && payload.nbf > now) {
    // Token belum aktif (jarang terjadi tapi perlu dicek)
    throw new Error("Token belum aktif");
  }

  // Token valid! Return payload
  return payload;
}

/**
 * 📖 decodeToken — Decode token TANPA verifikasi signature
 *
 * ⚠️  PERHATIAN: Gunakan ini HANYA untuk membaca payload
 *     tanpa keperluan verifikasi (misalnya untuk debug/logging).
 *     JANGAN gunakan untuk autentikasi!
 *
 * @param {string} token - JWT token string
 * @returns {object|null} Payload atau null jika format invalid
 */
export function decodeToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Langsung decode payload tanpa verifikasi
    return JSON.parse(fromBase64Url(parts[1]));
  } catch {
    return null;
  }
}

/**
 * ⏰ isTokenExpired — Cek apakah token sudah expired
 * Berguna untuk client-side check sebelum request ke server
 *
 * @param {string} token - JWT token string
 * @returns {boolean} true jika expired
 */
export function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * ⏳ getTokenExpirySeconds — Sisa waktu token dalam detik
 *
 * @param {string} token
 * @returns {number} Sisa detik, atau 0 jika expired
 */
export function getTokenExpirySeconds(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}
