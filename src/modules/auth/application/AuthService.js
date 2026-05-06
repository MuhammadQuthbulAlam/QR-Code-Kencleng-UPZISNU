// ============================================================
// src/modules/auth/application/AuthService.js
// Application Layer: Auth Service
//
// Berisi semua use case yang berhubungan dengan autentikasi:
// - login: verifikasi kredensial
// - getCurrentUser: ambil user dari session/token
// - logout: invalidasi session
// - register: pendaftaran user baru (jika dibuka)
//
// PENTING: Service ini tidak tahu tentang HTTP framework.
// Semua framework-specific (NextAuth, cookies, headers)
// ada di layer route/adapter.
// ============================================================

import bcrypt from "bcryptjs";
import { db } from "@/infrastructure/database/db";
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
} from "@/core/errors/AppError";
import { auth } from "@/lib/auth";

/**
 * AuthService - Use cases untuk autentikasi
 */
export class AuthService {
  /**
   * Use Case: Verifikasi kredensial login
   * Digunakan oleh NextAuth credentials provider
   *
   * @param {string} email - Email user
   * @param {string} password - Password plain text
   * @returns {object} Data user tanpa password
   * @throws {UnauthorizedError} Jika kredensial salah
   */
  async verifyCredentials(email, password) {
    if (!email || !password) {
      throw new ValidationError("Email dan password wajib diisi");
    }

    // Cari user berdasarkan email (dengan password untuk verifikasi)
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        avatar: true,
      },
    });

    if (!user) {
      // Gunakan pesan yang sama untuk email dan password salah
      // Ini mencegah "user enumeration attack"
      throw new UnauthorizedError("Email atau password salah");
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        "Akun Anda telah dinonaktifkan. Hubungi administrator.",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Email atau password salah");
    }

    // Return user tanpa password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Use Case: Ambil user yang sedang login dari session NextAuth
   * Bisa digunakan di Server Components dan API Routes
   *
   * @param {Request} [request] - Request object (diperlukan di API routes)
   * @returns {object|null} Session user atau null jika belum login
   */
  async getCurrentUser(request = null) {
    try {
      const session = await auth();
      if (!session?.user) return null;
      return session.user;
    } catch {
      return null;
    }
  }

  /**
   * Use Case: Cek apakah request sudah terautentikasi
   * Throws error jika belum login
   *
   * @param {Request} [request] - Request object
   * @returns {object} Session user
   * @throws {UnauthorizedError} Jika belum login
   */
  async requireAuth(request = null) {
    const user = await this.getCurrentUser(request);
    if (!user) {
      throw new UnauthorizedError("Anda harus login terlebih dahulu");
    }
    return user;
  }

  /**
   * Use Case: Cek apakah user punya role tertentu
   *
   * @param {Request} request - Request object
   * @param {string[]} allowedRoles - Role yang diizinkan
   * @returns {object} Session user jika punya akses
   * @throws {UnauthorizedError} Jika belum login
   * @throws {ForbiddenError} Jika tidak punya role yang sesuai
   */
  async requireRole(request, allowedRoles = []) {
    const user = await this.requireAuth(request);

    if (!allowedRoles.includes(user.role)) {
      const { ForbiddenError } = await import("@/core/errors/AppError");
      throw new ForbiddenError(
        `Fitur ini hanya bisa diakses oleh: ${allowedRoles.join(", ")}`,
      );
    }

    return user;
  }

  /**
   * Use Case: Daftarkan user baru
   * Hanya bisa digunakan jika registrasi publik dibuka
   *
   * @param {object} userData - { name, email, password }
   * @returns {object} Data user yang baru dibuat
   */
  async register({ name, email, password }) {
    // ── Validasi input ────────────────────────────────────
    const errors = [];
    if (!name?.trim())
      errors.push({ field: "name", message: "Nama wajib diisi" });
    if (!email?.trim())
      errors.push({ field: "email", message: "Email wajib diisi" });
    if (!password)
      errors.push({ field: "password", message: "Password wajib diisi" });
    if (password?.length < 8) {
      errors.push({
        field: "password",
        message: "Password minimal 8 karakter",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Data tidak valid", errors);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Cek duplikasi email ───────────────────────────────
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("Email sudah terdaftar, gunakan email lain");
    }

    // ── Hash password ─────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Buat user baru ────────────────────────────────────
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "MEMBER",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }
}

// Export singleton instance
export const authService = new AuthService();

// ── Helper untuk API Routes ───────────────────────────────────

/**
 * Shorthand: Ambil current user di API Route
 * Gunakan ini di setiap API route yang butuh autentikasi
 *
 * @example
 * export async function GET(request) {
 *   const currentUser = await getCurrentUser();
 *   if (!currentUser) return unauthorized();
 *   ...
 * }
 */
export async function getCurrentUser() {
  return authService.getCurrentUser();
}

/**
 * Shorthand: Require auth dan return user atau throw error
 */
export async function requireAuth() {
  return authService.requireAuth();
}

/**
 * Helper: Return response 401 Unauthorized
 */
export function unauthorized(message = "Anda harus login terlebih dahulu") {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ success: false, message }, { status: 401 });
}

/**
 * Helper: Return response 403 Forbidden
 */
export function forbidden(
  message = "Anda tidak memiliki izin untuk mengakses resource ini",
) {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ success: false, message }, { status: 403 });
}
