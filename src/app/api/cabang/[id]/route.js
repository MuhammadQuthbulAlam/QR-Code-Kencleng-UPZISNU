// ============================================================
// src/app/api/cabang/[id]/route.js
// GET    /api/cabang/:id          — detail cabang
// PUT    /api/cabang/:id          — update cabang
// DELETE /api/cabang/:id          — hapus cabang
// PATCH  /api/cabang/:id          — toggle aktif
// POST   /api/cabang/:id/assign   — assign user (sub-route via action)
// ============================================================

import { NextResponse } from "next/server";
import { cabangService } from "@/modules/cabang/application/CabangService";
import { formatErrorResponse } from "@/core/errors/AppError";

export async function GET(request, { params }) {
  try {
    const data = await cabangService.getCabangById(params.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const data = await cabangService.updateCabang(params.id, body);
    return NextResponse.json({
      success: true,
      message: "Cabang berhasil diperbarui",
      data,
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const result = await cabangService.deleteCabang(params.id);
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// PATCH: { "action": "toggle" } → aktif/nonaktif
// PATCH: { "action": "assign", "userId": "...", "role": "PETUGAS", "isDefault": true }
export async function PATCH(request, { params }) {
  try {
    const { action, ...rest } = await request.json();

    if (action === "toggle") {
      const result = await cabangService.toggleActive(params.id);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "assign") {
      const { userId, role, isDefault } = rest;
      if (!userId)
        return NextResponse.json(
          { success: false, message: "userId wajib diisi" },
          { status: 400 },
        );
      const result = await cabangService.assignUser(
        userId,
        params.id,
        role,
        isDefault,
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, message: "Action tidak dikenal" },
      { status: 400 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
