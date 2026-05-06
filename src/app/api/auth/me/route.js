// ============================================================
// src/app/api/auth/me/route.js
// API Route: GET /api/auth/me
//
// Mengembalikan data user yang sedang login.
// Berguna untuk client components yang butuh cek session
// tanpa perlu import useSession hook.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/application/AuthService";
import { successResponse } from "@/core/utils";

/**
 * GET /api/auth/me
 * Response: data user yang sedang login, atau 401 jika belum login
 */
export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Belum login" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      successResponse(user, "Data session berhasil diambil"),
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data session" },
      { status: 500 },
    );
  }
}
