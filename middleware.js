// ============================================================
// middleware.js (root project)
// Next.js Middleware — Autentikasi & Otorisasi
//
// Middleware ini berjalan di Edge Runtime SEBELUM setiap request.
// Menggunakan NextAuth v5 `auth()` untuk proteksi route.
//
// Route yang diproteksi:
// - /dashboard/*  → perlu login
// - /api/*        → beberapa perlu login (lihat konfigurasi)
//
// Route publik:
// - /login, /register → redirect ke dashboard jika sudah login
// - /scan             → publik (scan QR tanpa login)
// - /api/auth/*       → handler NextAuth, selalu publik
// ============================================================

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ── Konfigurasi Route ─────────────────────────────────────────

/** Route yang membutuhkan login */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/api/users",
  "/api/cabang",
  "/api/kencleng",
  "/api/transaksi",
  "/api/dashboard",
];

/** Route yang hanya untuk tamu (belum login) */
const GUEST_ONLY_ROUTES = ["/login", "/register"];

// ── Middleware ─────────────────────────────────────────────────
export default auth(function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const isLoggedIn = !!session?.user;

  // ── 1. Jika belum login dan akses protected route ──────────
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute && !isLoggedIn) {
    // Untuk API routes, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Anda harus login terlebih dahulu" },
        { status: 401 },
      );
    }

    // Untuk page routes, redirect ke login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Jika sudah login dan akses guest-only route ─────────
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isGuestOnlyRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── 3. Role-based access (Admin only routes) ───────────────
  const ADMIN_ONLY_ROUTES = ["/api/users"];
  const isAdminRoute = ADMIN_ONLY_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isAdminRoute && isLoggedIn && session.user.role !== "ADMIN") {
    return NextResponse.json(
      {
        success: false,
        message: "Hanya Administrator yang bisa mengakses resource ini",
      },
      { status: 403 },
    );
  }

  // ── 4. Lanjutkan request ────────────────────────────────────
  return NextResponse.next();
});

// ── Konfigurasi matcher ───────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match semua path kecuali:
     * - _next/static  (file statis Next.js)
     * - _next/image   (image optimizer)
     * - favicon.ico
     * - File dengan ekstensi: png, jpg, jpeg, gif, webp, svg, ico, woff, woff2
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$).*)",
  ],
};
