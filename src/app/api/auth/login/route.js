// ============================================================
// src/app/api/auth/login/route.js
// API Route: POST /api/auth/login
//
// Endpoint custom untuk login via fetch (non-NextAuth flow).
// Digunakan oleh halaman login untuk:
// 1. Validasi kredensial
// 2. Set cookie session via NextAuth
// 3. Return user data ke client
//
// Untuk login yang sebenarnya, gunakan signIn() dari NextAuth
// di client component. Route ini berguna untuk:
// - Mobile apps / API clients yang butuh token langsung
// - Testing dan debugging
// ============================================================

import { NextResponse } from "next/server";
import { authService } from "@/modules/auth/application/AuthService";
import { formatErrorResponse, successResponse } from "@/core/utils";

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function POST(request) {
  try {
    // ── Parse request body ────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format request tidak valid" },
        { status: 400 },
      );
    }

    const { email, password } = body;

    // ── Verifikasi kredensial ─────────────────────────────
    const user = await authService.verifyCredentials(email, password);

    // ── Return data user (session dikelola oleh NextAuth) ──
    // Untuk login sebenarnya di browser, gunakan signIn() dari next-auth/react
    // Endpoint ini hanya mengembalikan data user yang valid
    return NextResponse.json(
      successResponse(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        "Login berhasil",
      ),
      { status: 200 },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
