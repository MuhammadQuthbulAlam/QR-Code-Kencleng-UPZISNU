// ============================================================
// src/app/api/cabang/route.js
// GET  /api/cabang  — list semua cabang
// POST /api/cabang  — buat cabang baru
//
// Query params (GET):
//   page, limit, daerah, tingkat, search, active
//   tree=true → return nested tree structure
// ============================================================

import { NextResponse } from "next/server";
import { cabangService } from "@/modules/cabang/application/CabangService";
import { formatErrorResponse } from "@/core/errors/AppError";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const result = await cabangService.listCabang(query);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const cabang = await cabangService.createCabang(body);

    return NextResponse.json(
      {
        success: true,
        message: `Cabang "${cabang.nama}" berhasil dibuat`,
        data: cabang,
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
