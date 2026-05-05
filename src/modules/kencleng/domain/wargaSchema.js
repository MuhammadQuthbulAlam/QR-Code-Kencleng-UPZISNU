// ============================================================
// src/modules/kencleng/domain/wargaSchema.js
// Validation Schemas menggunakan Zod
//
// Mendefinisikan aturan validasi untuk setiap operasi:
// - createWargaSchema  : validasi saat input manual
// - updateWargaSchema  : validasi saat edit (semua field opsional)
// - excelRowSchema     : validasi satu baris dari file Excel
// - importQuerySchema  : validasi query parameter API import
// ============================================================

import { z } from "zod";

// ── Reusable field validators ────────────────────────────────

// Validasi no_kencleng: string, tidak kosong, bisa berupa angka atau kode
const noKenclengField = z
  .string({ required_error: "Nomor kencleng wajib diisi" })
  .min(1, "Nomor kencleng tidak boleh kosong")
  .max(20, "Nomor kencleng terlalu panjang")
  .trim()
  // Harus berisi minimal satu digit angka
  .refine((v) => /\d/.test(v), "Nomor kencleng harus mengandung angka");

const namaField = z
  .string({ required_error: "Nama wajib diisi" })
  .min(2, "Nama minimal 2 karakter")
  .max(100, "Nama terlalu panjang (maksimal 100 karakter)")
  .trim()
  // Nama tidak boleh hanya angka
  .refine((v) => /[a-zA-Z]/.test(v), "Nama harus mengandung huruf");

const rantingField = z
  .string({ required_error: "Ranting wajib diisi" })
  .min(2, "Nama ranting minimal 2 karakter")
  .max(100, "Nama ranting terlalu panjang")
  .trim();

const alamatField = z
  .string({ required_error: "Alamat wajib diisi" })
  .min(5, "Alamat terlalu singkat (minimal 5 karakter)")
  .max(500, "Alamat terlalu panjang (maksimal 500 karakter)")
  .trim();

// ── Schema: Buat warga baru (input manual) ───────────────────
/**
 * Digunakan di POST /api/kencleng
 * Semua field wajib.
 * QR code akan di-generate otomatis oleh server — tidak perlu dikirim.
 */
export const createWargaSchema = z.object({
  no_kencleng: noKenclengField,
  nama: namaField,
  ranting: rantingField,
  alamat: alamatField,
});

// ── Schema: Update warga (edit) ──────────────────────────────
/**
 * Digunakan di PUT /api/kencleng/[id]
 * Semua field opsional — hanya field yang dikirim yang diupdate (PATCH semantics).
 * Minimal satu field harus ada.
 */
export const updateWargaSchema = z
  .object({
    no_kencleng: noKenclengField.optional(),
    nama: namaField.optional(),
    ranting: rantingField.optional(),
    alamat: alamatField.optional(),
    isActive: z.boolean().optional(), // Bisa nonaktifkan warga
  })
  .refine(
    // Pastikan minimal satu field dikirim (tidak kirim {} kosong)
    (data) => Object.keys(data).length > 0,
    "Minimal satu field harus diisi untuk update",
  );

// ── Schema: Satu baris data dari Excel ──────────────────────
/**
 * Digunakan saat parsing setiap baris dari file Excel.
 *
 * Kolom yang diharapkan di Excel:
 *   A: no_kencleng  (atau "No Kencleng", "nomor_kencleng")
 *   B: nama         (atau "Nama", "NAMA")
 *   C: ranting      (atau "Ranting", "RANTING")
 *   D: alamat       (atau "Alamat", "ALAMAT")
 *
 * Menggunakan .coerce untuk konversi otomatis tipe data Excel
 * (Excel kadang mengembalikan angka, bukan string).
 */
export const excelRowSchema = z.object({
  // coerce.string() → paksa konversi ke string (angka Excel → "42")
  no_kencleng: z.coerce
    .string()
    .min(1, "Nomor kencleng tidak boleh kosong")
    .max(20)
    .trim()
    .refine((v) => /\d/.test(v), "Nomor kencleng harus mengandung angka"),

  nama: z.coerce
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100)
    .trim()
    .refine((v) => /[a-zA-Z]/.test(v), "Nama harus mengandung huruf"),

  ranting: z.coerce
    .string()
    .min(2, "Nama ranting minimal 2 karakter")
    .max(100)
    .trim(),

  alamat: z.coerce.string().min(5, "Alamat terlalu singkat").max(500).trim(),
});

// ── Schema: Query params untuk GET /api/kencleng ────────────
/**
 * Validasi query parameter pada endpoint list warga.
 *
 * Contoh URL: /api/kencleng?page=1&limit=20&search=ahmad&ranting=Kauman
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(), // Cari nama / no_kencleng
  ranting: z.string().max(100).optional(), // Filter per ranting
  active: z.enum(["true", "false"]).optional(), // Filter status aktif
});

// ── Helper: Format Zod errors ke array pesan ────────────────
/**
 * Mengkonversi ZodError menjadi array error yang user-friendly
 *
 * @param {import("zod").ZodError} zodError
 * @returns {Array<{ field: string, message: string }>}
 *
 * @example
 * // Output:
 * [
 *   { field: "nama", message: "Nama minimal 2 karakter" },
 *   { field: "alamat", message: "Alamat wajib diisi" }
 * ]
 */
export function formatZodErrors(zodError) {
  return zodError.errors.map((err) => ({
    field: err.path.join(".") || "unknown", // Path field yang error
    message: err.message, // Pesan error
  }));
}
