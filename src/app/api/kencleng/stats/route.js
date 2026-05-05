// ============================================================
// src/app/api/kencleng/stats/route.js
// API Route: GET /api/kencleng/stats — statistik dashboard kencleng
// ============================================================

import { NextResponse } from "next/server";
import { wargaService } from "@/modules/kencleng/application/WargaService";
import { formatErrorResponse } from "@/core/errors/AppError";

// ── GET /api/kencleng/stats ───────────────────────────────────
/**
 * Ambil statistik ringkasan untuk dashboard kencleng.
 *
 * Response 200:
 * {
 *   success: true,
 *   data: {
 *     stats: { total, active, inactive, totalRanting },
 *     rantingList: ["Ranting A", "Ranting B", ...]
 *   }
 * }
 */
export async function GET() {
  try {
    // Jalankan dua query paralel untuk efisiensi
    const [stats, rantingList] = await Promise.all([
      wargaService.getStats(),
      wargaService.getRantingList(),
    ]);

    return NextResponse.json({
      success: true,
      data: { stats, rantingList },
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
