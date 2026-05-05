// ============================================================
// src/app/api/dashboard/route.js
// GET /api/dashboard — Agregasi data untuk admin dashboard
//
// Query params:
//   dateFrom  : "YYYY-MM-DD"  (default: awal bulan ini)
//   dateTo    : "YYYY-MM-DD"  (default: akhir bulan ini)
//   ranting   : nama ranting (opsional)
//
// Response menyertakan semua data yang dibutuhkan dashboard
// dalam satu request untuk meminimalkan waterfall fetch.
// ============================================================

import { NextResponse } from "next/server";
import { dashboardService } from "@/modules/dashboard/application/DashboardService";
import { formatErrorResponse } from "@/core/errors/AppError";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      ranting: searchParams.get("ranting") || undefined,
      cabangId: searchParams.get("cabangId") || undefined, // ← baru
    };

    const data = await dashboardService.getData(filters);

    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          // Cache 30 detik di edge, revalidate di background
          // Ini membuat dashboard "realtime" tanpa hammering DB
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
