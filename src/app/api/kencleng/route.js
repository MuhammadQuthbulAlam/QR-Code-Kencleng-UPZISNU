// ============================================================
// src/app/api/kencleng/route.js
// API Route: GET /api/kencleng — list warga
//            POST /api/kencleng — tambah warga manual
// ============================================================

import { NextResponse } from "next/server";
import { wargaService } from "@/modules/kencleng/application/WargaService";
import { formatErrorResponse } from "@/core/errors/AppError";

// ── GET /api/kencleng ────────────────────────────────────────
/**
 * Ambil daftar warga dengan pagination, search, dan filter.
 *
 * Query params:
 *   page    : nomor halaman (default 1)
 *   limit   : jumlah per halaman (default 20, max 100)
 *   search  : keyword nama / no_kencleng / ranting
 *   ranting : filter berdasarkan ranting (exact)
 *   active  : "true" | "false" — filter status aktif
 *
 * Response 200:
 * {
 *   success: true,
 *   data: [ { id, no_kencleng, nama, ranting, alamat, qr_code, ... } ],
 *   total: 42,
 *   page: 1, limit: 20, totalPages: 3,
 *   hasNextPage: true, hasPrevPage: false
 * }
 */
export async function GET(request) {
  try {
    // Ambil semua query parameter dari URL
    const { searchParams } = new URL(request.url);
    const query = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      ranting: searchParams.get("ranting"),
      active: searchParams.get("active"),
    };

    const result = await wargaService.listWarga(query);

    return NextResponse.json(
      {
        success: true,
        message: "Berhasil mengambil data warga",
        ...result, // Spread: data, total, page, limit, totalPages, hasNextPage, hasPrevPage
      },
      { status: 200 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── POST /api/kencleng ───────────────────────────────────────
/**
 * Tambah satu warga baru secara manual.
 * QR code di-generate otomatis oleh server.
 *
 * Request body (JSON):
 * {
 *   "no_kencleng": "0042",
 *   "nama":        "Ahmad Fauzi",
 *   "ranting":     "Ranting Kauman",
 *   "alamat":      "Jl. Masjid No. 1, Kauman"
 * }
 *
 * Response 201:
 * {
 *   success: true,
 *   message: "...",
 *   data: { id, no_kencleng, nama, ranting, alamat, qr_code, qr_image, ... }
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const warga = await wargaService.createWarga(body);

    return NextResponse.json(
      {
        success: true,
        message: `Warga "${warga.nama}" berhasil ditambahkan dengan QR Code ${warga.qr_code}`,
        data: warga,
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
