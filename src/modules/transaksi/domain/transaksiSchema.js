// ============================================================
// src/modules/transaksi/domain/transaksiSchema.js
// Zod Validation Schemas untuk Transaksi
// ============================================================

import { z } from "zod";
import { NOMINAL_MIN, NOMINAL_MAX } from "./Transaksi";

// ── Schema: Buat transaksi baru ──────────────────────────────
/**
 * Dipakai di POST /api/transaksi
 *
 * Field wajib:
 *   wargaId  — ID warga dari hasil lookup QR
 *   nominal  — jumlah Rupiah (integer, ≥500)
 *
 * Field opsional:
 *   catatan          — catatan bebas petugas
 *   metodePembayaran — TUNAI | TRANSFER | LAINNYA
 *   bulan/tahun      — periode setoran (default: bulan/tahun sekarang)
 */
export const createTransaksiSchema = z.object({
  wargaId: z
    .string({ required_error: "ID warga wajib diisi" })
    .min(1, "ID warga tidak boleh kosong"),

  nominal: z
    .number({
      required_error: "Nominal wajib diisi",
      invalid_type_error: "Nominal harus berupa angka",
    })
    .int("Nominal harus bilangan bulat (tanpa desimal)")
    .min(
      NOMINAL_MIN,
      `Nominal minimal Rp ${NOMINAL_MIN.toLocaleString("id-ID")}`,
    )
    .max(
      NOMINAL_MAX,
      `Nominal maksimal Rp ${NOMINAL_MAX.toLocaleString("id-ID")}`,
    ),

  catatan: z
    .string()
    .max(255, "Catatan maksimal 255 karakter")
    .optional()
    .nullable(),

  metodePembayaran: z
    .enum(["TUNAI", "TRANSFER", "LAINNYA"], {
      errorMap: () => ({ message: "Metode pembayaran tidak valid" }),
    })
    .default("TUNAI"),

  // Jika tidak dikirim, server akan isi dengan bulan & tahun sekarang
  bulan: z
    .number()
    .int()
    .min(1, "Bulan tidak valid")
    .max(12, "Bulan tidak valid")
    .optional(),

  tahun: z
    .number()
    .int()
    .min(2020, "Tahun tidak valid")
    .max(2100, "Tahun tidak valid")
    .optional(),

  // Nama petugas dari session (diisi server, bukan dari client)
  petugasId: z.string().optional().nullable(),
  petugasNama: z.string().max(100).optional().nullable(),
});

// ── Schema: Query params GET /api/transaksi ──────────────────
export const listTransaksiSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  wargaId: z.string().optional(), // Filter per warga
  ranting: z.string().optional(), // Filter per ranting
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  tahun: z.coerce.number().int().optional(),
  status: z.enum(["PENDING", "SUKSES", "DIBATALKAN"]).optional(),
  search: z.string().max(100).optional(), // Cari nama warga / no kencleng
  dateFrom: z.string().optional(), // Filter range tanggal
  dateTo: z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────
export function formatZodErrors(zodError) {
  return zodError.errors.map((e) => ({
    field: e.path.join(".") || "unknown",
    message: e.message,
  }));
}
