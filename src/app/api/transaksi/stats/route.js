// ============================================================
// src/app/api/transaksi/stats/route.js
// GET /api/transaksi/stats — statistik setoran untuk dashboard
// ============================================================

import { NextResponse } from "next/server";
import { transaksiService } from "@/modules/transaksi/application/TransaksiService";
import { formatErrorResponse } from "@/core/errors/AppError";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get("bulan")
      ? parseInt(searchParams.get("bulan"))
      : undefined;
    const tahun = searchParams.get("tahun")
      ? parseInt(searchParams.get("tahun"))
      : undefined;

    const stats = await transaksiService.getStats({ bulan, tahun });

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
