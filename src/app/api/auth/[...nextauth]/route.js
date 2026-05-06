// ============================================================
// src/app/api/auth/[...nextauth]/route.js
// NextAuth.js v5 Handler
//
// File ini adalah entry point untuk semua request autentikasi:
// - GET/POST /api/auth/signin
// - GET/POST /api/auth/signout
// - GET/POST /api/auth/session
// - GET /api/auth/csrf
// - GET /api/auth/providers
// - GET/POST /api/auth/callback/[provider]
// ============================================================

export { GET, POST } from "@/lib/auth";
