// ============================================================
// src/app/api/users/route.js
// API Route: /api/users
// Menangani request GET (list users) dan POST (create user)
//
// Dalam Clean Architecture, API Route ada di Interface Layer.
// Route hanya bertanggung jawab untuk:
// 1. Parse request (params, body, headers)
// 2. Panggil Application Service
// 3. Format response
// ============================================================

import { NextResponse } from "next/server";
import { userService } from "@/modules/users/application/UserService";
import { formatErrorResponse, successResponse } from "@/core/utils";
// import { getCurrentUser } from "@/modules/auth/application/AuthService";

// ── GET /api/users ───────────────────────────────────────────
/**
 * Mengambil daftar semua user dengan pagination, search, filter
 * Hanya bisa diakses oleh ADMIN
 *
 * Query params yang didukung:
 * - page: nomor halaman (default: 1)
 * - limit: jumlah per halaman (default: 10, max: 100)
 * - search: keyword pencarian nama/email
 * - role: filter berdasarkan role (ADMIN|MODERATOR|MEMBER)
 */
export async function GET(request) {
  try {
    // ── Ambil query parameters dari URL ──────────────────────
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      role: searchParams.get("role"),
    };

    // ── TODO: Implementasi autentikasi ───────────────────────
    // const currentUser = await getCurrentUser(request);
    // Sementara: mock admin user untuk development
    const currentUser = {
      id: "mock-admin-id",
      isAdmin: () => true,
      isModerator: () => false,
    };

    // ── Panggil service ───────────────────────────────────────
    const result = await userService.getAllUsers(params, currentUser);

    // ── Return response sukses ────────────────────────────────
    return NextResponse.json(
      successResponse(result.users, "Berhasil mengambil data pengguna", {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      }),
      { status: 200 }
    );
  } catch (error) {
    // ── Error handling ────────────────────────────────────────
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── POST /api/users ──────────────────────────────────────────
/**
 * Membuat user baru
 * Hanya bisa dilakukan oleh ADMIN
 *
 * Request body yang diharapkan:
 * {
 *   "name": "Ahmad Fauzi",
 *   "email": "ahmad@nu.or.id",
 *   "password": "Password123",
 *   "role": "MEMBER"  // opsional, default MEMBER
 * }
 */
export async function POST(request) {
  try {
    // ── Parse request body ────────────────────────────────────
    const body = await request.json();

    // ── TODO: Autentikasi ─────────────────────────────────────
    // const currentUser = await getCurrentUser(request);
    const currentUser = {
      id: "mock-admin-id",
      isAdmin: () => true,
    };

    // ── Panggil service ───────────────────────────────────────
    const user = await userService.createUser(body, currentUser);

    // ── Return 201 Created ────────────────────────────────────
    return NextResponse.json(
      successResponse(user, "Pengguna berhasil dibuat"),
      { status: 201 }
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
