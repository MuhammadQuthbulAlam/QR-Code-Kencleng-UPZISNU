// ============================================================
// src/app/api/cabang/dropdown/route.js
// GET /api/cabang/dropdown
//
// Endpoint ringan khusus untuk mengisi dropdown/select form.
// Return dua format:
//   flat:    array flat semua cabang aktif
//   grouped: dikelompokkan per daerah untuk optgroup HTML
// ============================================================

import { NextResponse } from "next/server";
import { cabangService } from "@/modules/cabang/application/CabangService";
import { formatErrorResponse } from "@/core/errors/AppError";

export async function GET() {
  try {
    const data = await cabangService.getDropdownList();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
