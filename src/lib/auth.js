// ============================================================
// src/lib/auth.js
// Konfigurasi NextAuth.js v5
//
// File ini berisi konfigurasi lengkap autentikasi:
// - Credentials provider (email + password)
// - Session strategy (JWT)
// - Callbacks untuk enrichment token & session
// - Custom pages
//
// CARA KERJA:
// 1. User submit form login → credentials provider dipanggil
// 2. Provider verifikasi email + password ke database
// 3. Jika valid → JWT token dibuat dengan data user (id, role, dll)
// 4. JWT disimpan sebagai cookie terenkripsi
// 5. Setiap request → session callback mengambil data dari token
// ============================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/infrastructure/database/db";

// ── Konfigurasi NextAuth ─────────────────────────────────────
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // ── Secret untuk enkripsi token ──────────────────────────
  secret: process.env.NEXTAUTH_SECRET,

  // ── Custom pages ─────────────────────────────────────────
  pages: {
    signIn: "/login", // Halaman login custom
    error: "/login", // Redirect error ke halaman login
    signOut: "/login", // Redirect setelah logout
  },

  // ── Session strategy ─────────────────────────────────────
  session: {
    strategy: "jwt", // Gunakan JWT (bukan database session)
    maxAge: 60 * 60 * 24 * 7, // Session expired 7 hari
    updateAge: 60 * 60 * 24, // Update token setiap 24 jam
  },

  // ── Providers: cara user bisa login ──────────────────────
  providers: [
    Credentials({
      name: "credentials",

      // Definisi field yang ditampilkan di default NextAuth UI
      // (tidak dipakai karena kita punya custom login page)
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "contoh@nu.or.id",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      // ── Logika verifikasi login ──────────────────────────
      /**
       * Dipanggil saat user submit form login
       * @param {object} credentials - { email, password }
       * @returns {object|null} User object jika valid, null jika tidak
       */
      async authorize(credentials) {
        // ── Validasi input dasar ──────────────────────────
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi");
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // ── Cari user di database ────────────────────────
        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true, // Perlu untuk verifikasi
            role: true,
            isActive: true,
            avatar: true,
          },
        });

        // User tidak ditemukan
        if (!user) {
          throw new Error("Email atau password salah");
        }

        // Akun dinonaktifkan
        if (!user.isActive) {
          throw new Error(
            "Akun Anda telah dinonaktifkan. Hubungi administrator.",
          );
        }

        // ── Verifikasi password dengan bcrypt ────────────
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new Error("Email atau password salah");
        }

        // ── Return user object (password TIDAK disertakan) ─
        // Data ini akan dimasukkan ke JWT token via jwt callback
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          avatar: user.avatar,
        };
      },
    }),
  ],

  // ── Callbacks ─────────────────────────────────────────────
  callbacks: {
    /**
     * jwt callback: dipanggil saat token JWT dibuat/diperbarui
     * Digunakan untuk menambahkan data custom ke token
     *
     * @param {object} token - JWT token saat ini
     * @param {object} user - User object (hanya ada saat login pertama)
     */
    async jwt({ token, user }) {
      // user hanya ada saat pertama kali login (sign in)
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
        token.avatar = user.avatar;
      }
      return token;
    },

    /**
     * session callback: dipanggil setiap kali session diakses
     * Digunakan untuk menyertakan data custom di session
     * yang bisa diakses di client/server components
     *
     * @param {object} session - Session object
     * @param {object} token - JWT token yang sudah di-enrich
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isActive = token.isActive;
        session.user.avatar = token.avatar;
      }
      return session;
    },

    /**
     * authorized callback: dipanggil oleh middleware untuk cek akses
     * Return true = akses diizinkan, false = redirect ke login
     */
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Route publik yang tidak perlu autentikasi
      const publicRoutes = ["/login", "/register", "/scan"];
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route),
      );

      if (isPublicRoute) return true;

      // Route dashboard perlu login
      if (pathname.startsWith("/dashboard")) {
        if (!isLoggedIn) return false; // Redirect ke login
        return true;
      }

      return true;
    },
  },

  // ── Konfigurasi tambahan ──────────────────────────────────
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
});
