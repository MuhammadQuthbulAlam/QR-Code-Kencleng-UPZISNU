// ============================================================
// src/app/api/transaksi/route.js
// POST /api/transaksi — catat transaksi baru
// GET  /api/transaksi — list riwayat transaksi
// ============================================================

import { NextResponse } from "next/server";
import { transaksiService } from "@/modules/transaksi/application/TransaksiService";
import { formatErrorResponse } from "@/core/errors/AppError";

// ── POST /api/transaksi ──────────────────────────────────────
/**
 * Simpan satu transaksi setoran kencleng.
 *
 * Body JSON:
 * {
 *   "wargaId":          "cm...",      ← wajib, dari hasil lookup QR
 *   "nominal":          10000,        ← wajib, integer Rupiah ≥ 500
 *   "metodePembayaran": "TUNAI",      ← opsional (default TUNAI)
 *   "catatan":          "setoran...", ← opsional
 *   "bulan":            1,            ← opsional (default bulan ini)
 *   "tahun":            2025          ← opsional (default tahun ini)
 * }
 *
 * Response 201:
 * {
 *   "success": true,
 *   "message": "Transaksi berhasil dicatat",
 *   "data": { id, noKencleng, namaWarga, nominal, nominalFormatted, ... }
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Isi petugasNama dari header auth (setelah middleware aktif)
    // Sementara: ambil dari body atau null
    const input = {
      ...body,
      petugasNama: body.petugasNama ?? "Petugas",
    };

    const transaksi = await transaksiService.createTransaksi(input);

    return NextResponse.json(
      {
        success: true,
        message: `Setoran ${transaksi.nominalFormatted} dari ${transaksi.namaWarga} berhasil dicatat`,
        data: transaksi,
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── GET /api/transaksi ───────────────────────────────────────
/**
 * Ambil daftar transaksi dengan filter & pagination.
 *
 * Query params:
 *   page, limit, wargaId, ranting, bulan, tahun, status, search
 *   dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Kumpulkan semua query params ke satu object
    const query = Object.fromEntries(searchParams.entries());

    const result = await transaksiService.listTransaksi(query);

    return NextResponse.json(
      { success: true, message: "Berhasil", ...result },
      { status: 200 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
