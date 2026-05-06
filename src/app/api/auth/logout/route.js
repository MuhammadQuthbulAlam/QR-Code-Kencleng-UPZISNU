// ============================================================
// src/app/api/auth/logout/route.js
// API Route: POST /api/auth/logout
//
// Endpoint untuk logout.
// Untuk logout di browser dengan NextAuth, cukup panggil
// signOut() dari 'next-auth/react'.
//
// Endpoint ini berguna untuk:
// - API clients / mobile apps
// - Server-side logout yang perlu custom logic
// ============================================================

import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

/**
 * POST /api/auth/logout
 */
export async function POST(request) {
  try {
    // Invalidasi session (NextAuth v5)
    await signOut({ redirect: false });

    return NextResponse.json(
      { success: true, message: "Berhasil logout" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal logout" },
      { status: 500 },
    );
  }
}
