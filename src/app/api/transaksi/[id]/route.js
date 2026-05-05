// ============================================================
// src/app/api/transaksi/[id]/route.js
// GET    /api/transaksi/:id — detail transaksi
// PATCH  /api/transaksi/:id — batalkan transaksi
// ============================================================

import { NextResponse } from "next/server";
import { transaksiService } from "@/modules/transaksi/application/TransaksiService";
import { formatErrorResponse } from "@/core/errors/AppError";

export async function GET(request, { params }) {
  try {
    const data = await transaksiService.getTransaksiById(params.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// PATCH /api/transaksi/:id  { "action": "batalkan", "alasan": "..." }
export async function PATCH(request, { params }) {
  try {
    const { action, alasan } = await request.json();

    if (action !== "batalkan") {
      return NextResponse.json(
        {
          success: false,
          message: "Action tidak dikenal. Gunakan 'batalkan'.",
        },
        { status: 400 },
      );
    }

    const data = await transaksiService.batalkanTransaksi(params.id, alasan);
    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil dibatalkan",
      data,
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
