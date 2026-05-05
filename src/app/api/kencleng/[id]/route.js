// ============================================================
// src/app/api/kencleng/[id]/route.js
// API Route: GET    /api/kencleng/:id  — detail warga
//            PUT    /api/kencleng/:id  — update warga
//            DELETE /api/kencleng/:id  — hapus warga
// ============================================================

import { NextResponse } from "next/server";
import { wargaService } from "@/modules/kencleng/application/WargaService";
import { formatErrorResponse } from "@/core/errors/AppError";

// ── GET /api/kencleng/:id ────────────────────────────────────
/**
 * Ambil detail lengkap satu warga, termasuk qr_image (base64 PNG).
 *
 * Path param:
 *   id : string — ID warga (CUID)
 *
 * Response 200:
 * {
 *   success: true,
 *   data: {
 *     id, no_kencleng, nama, ranting, alamat,
 *     qr_code,  ← "UPZ-0042"
 *     qr_image, ← "data:image/png;base64,..."  (untuk <img src={qr_image}>)
 *     isActive, importBatch, createdAt, updatedAt
 *   }
 * }
 */
export async function GET(request, { params }) {
  try {
    const { id } = params; // Next.js inject params dari URL segment [id]

    const warga = await wargaService.getWargaById(id);

    return NextResponse.json({ success: true, data: warga }, { status: 200 });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── PUT /api/kencleng/:id ────────────────────────────────────
/**
 * Update data warga.
 * Kirim hanya field yang ingin diubah.
 * Jika no_kencleng berubah → QR code di-regenerate otomatis.
 *
 * Request body (JSON) — semua field opsional:
 * {
 *   "nama":    "Ahmad Fauzi Baru",
 *   "ranting": "Ranting Baru",
 *   "alamat":  "Alamat Baru"
 * }
 *
 * Response 200:
 * { success: true, message: "...", data: { ... } }
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const updated = await wargaService.updateWarga(id, body);

    return NextResponse.json(
      {
        success: true,
        message: `Data warga "${updated.nama}" berhasil diperbarui`,
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── DELETE /api/kencleng/:id ─────────────────────────────────
/**
 * Hapus warga permanen dari database.
 *
 * ⚠️  Operasi ini tidak bisa di-undo!
 *
 * Response 200:
 * { success: true, message: "Warga ... berhasil dihapus" }
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const result = await wargaService.deleteWarga(id);

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
