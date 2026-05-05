// ============================================================
// src/interfaces/http/middlewares/middleware.js
// (Copy ke: middleware.js di root project)
//
// Next.js Middleware untuk autentikasi dan otorisasi
// Dijalankan SEBELUM setiap request ke server
//
// Fungsi:
// - Redirect user yang belum login ke halaman login
// - Redirect user yang sudah login dari halaman auth ke dashboard
// - Proteksi route berdasarkan role
// ============================================================

import { NextResponse } from "next/server";
// import { getToken } from "next-auth/jwt"; // Aktifkan setelah setup NextAuth

// ── Konfigurasi Route ────────────────────────────────────────

/**
 * Route yang membutuhkan autentikasi
 * User harus login untuk mengakses route ini
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
];

/**
 * Route yang hanya bisa diakses tanpa login
 * Jika sudah login, redirect ke dashboard
 */
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
];

/**
 * Route yang membutuhkan role ADMIN
 */
const ADMIN_ROUTES = [
  "/dashboard/users",
  "/dashboard/settings",
  "/api/users",
];

// ── Middleware Function ──────────────────────────────────────
/**
 * Middleware utama Next.js
 * Dipanggil sebelum setiap request yang cocok dengan `config.matcher`
 *
 * @param {NextRequest} request
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ── Ambil token session ─────────────────────────────────────
  // const token = await getToken({
  //   req: request,
  //   secret: process.env.NEXTAUTH_SECRET,
  // });

  // Simulasi token untuk development (hapus saat production)
  const token = null; // null = belum login

  const isLoggedIn = !!token;
  const userRole = token?.role || null;

  // ── Proteksi route yang butuh login ─────────────────────────
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isLoggedIn) {
    // Simpan URL tujuan agar bisa redirect kembali setelah login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect dari auth routes jika sudah login ───────────────
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isLoggedIn) {
    // Sudah login, redirect ke dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Proteksi route admin ─────────────────────────────────────
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (isAdminRoute && isLoggedIn && userRole !== "ADMIN") {
    // Sudah login tapi bukan admin, redirect ke dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Lanjutkan request jika semua check lolos ─────────────────
  return NextResponse.next();
}

// ── Konfigurasi Matcher ──────────────────────────────────────
/**
 * Tentukan route mana yang akan diproses oleh middleware
 * Menggunakan negative lookahead untuk exclude static files
 */
export const config = {
  matcher: [
    /*
     * Match semua path KECUALI:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - File dengan ekstensi (gambar, font, dll)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
