// ============================================================
// src/modules/cabang/domain/cabangSchema.js
// Zod Validation Schemas untuk Cabang
// ============================================================

import { z } from "zod";

export const createCabangSchema = z.object({
  kode: z
    .string()
    .min(3)
    .max(30)
    .trim()
    .regex(
      /^[A-Z0-9\-]+$/,
      "Kode hanya boleh huruf kapital, angka, dan tanda hubung",
    ),
  nama: z.string().min(3).max(150).trim(),
  daerah: z.string().min(2).max(100).trim(),
  tingkat: z.enum(["WILAYAH", "CABANG", "MWC"]).default("CABANG"),
  alamat: z.string().max(500).optional().nullable(),
  telepon: z.string().max(20).optional().nullable(),
  email: z.string().email("Format email tidak valid").optional().nullable(),
  ketua: z.string().max(100).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const updateCabangSchema = createCabangSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Minimal satu field harus diisi");

export const listCabangSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  daerah: z.string().optional(),
  tingkat: z.enum(["WILAYAH", "CABANG", "MWC"]).optional(),
  search: z.string().max(100).optional(),
  active: z.enum(["true", "false"]).optional(),
  tree: z.enum(["true", "false"]).optional(), // Return as tree structure
});

export function formatZodErrors(zodError) {
  return zodError.errors.map((e) => ({
    field: e.path.join(".") || "unknown",
    message: e.message,
  }));
}
