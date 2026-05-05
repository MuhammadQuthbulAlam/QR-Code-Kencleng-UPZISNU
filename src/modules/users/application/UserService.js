// ============================================================
// src/modules/users/application/UserService.js
// Application Layer: User Service
//
// Application Layer berisi use cases / business logic.
// Service ini TIDAK tahu tentang HTTP, database, atau framework.
// Service hanya tahu tentang:
// - Domain entities
// - Repository interfaces
// - Business rules
// ============================================================

import bcrypt from "bcryptjs";
import { userRepository } from "../infrastructure/UserRepository";
import { ValidationError, NotFoundError, ForbiddenError } from "@/core/errors/AppError";
import { getPaginationMeta } from "@/core/utils";

/**
 * UserService - Berisi semua use case yang berhubungan dengan User
 *
 * Use cases yang tersedia:
 * - getAllUsers: Ambil semua user dengan pagination
 * - getUserById: Ambil detail satu user
 * - createUser: Buat user baru
 * - updateUser: Update data user
 * - deleteUser: Hapus user
 * - changePassword: Ganti password
 */
export class UserService {
  /**
   * Use Case: Ambil semua user dengan pagination, search, dan filter
   * Hanya ADMIN yang bisa melihat semua user
   *
   * @param {object} params - Parameter query
   * @param {User} currentUser - User yang sedang login (untuk otorisasi)
   */
  async getAllUsers(params = {}, currentUser) {
    // ── Otorisasi: hanya admin ────────────────────────────────
    if (!currentUser.isAdmin()) {
      throw new ForbiddenError("Hanya Administrator yang bisa melihat daftar semua pengguna");
    }

    // Ambil parameter dengan default values
    const page = Math.max(1, parseInt(params.page) || 1);     // Minimal page 1
    const limit = Math.min(100, parseInt(params.limit) || 10); // Maksimal 100 per halaman
    const search = params.search?.trim() || "";
    const role = params.role || null;

    // Ambil data dari repository
    const { users, total } = await userRepository.findAll({ page, limit, search, role });

    // Hitung metadata pagination
    const meta = getPaginationMeta(total, page, limit);

    return {
      users: users.map((u) => u.toPublicObject()), // Strip data sensitif
      ...meta,
    };
  }

  /**
   * Use Case: Ambil detail satu user berdasarkan ID
   *
   * @param {string} userId - ID user yang dicari
   * @param {User} currentUser - User yang sedang login
   */
  async getUserById(userId, currentUser) {
    // User hanya bisa lihat profil sendiri, kecuali admin
    if (userId !== currentUser.id && !currentUser.isAdmin()) {
      throw new ForbiddenError("Anda tidak memiliki akses untuk melihat profil pengguna lain");
    }

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("Pengguna");
    }

    return user.toPublicObject();
  }

  /**
   * Use Case: Buat user baru
   * Hanya admin yang bisa membuat user baru via panel ini
   * (Registrasi publik ada di AuthService)
   *
   * @param {object} userData - Data user baru
   * @param {User} currentUser - Admin yang membuat
   */
  async createUser(userData, currentUser) {
    // ── Otorisasi ─────────────────────────────────────────────
    if (!currentUser.isAdmin()) {
      throw new ForbiddenError("Hanya Administrator yang bisa membuat pengguna baru");
    }

    // ── Validasi input ────────────────────────────────────────
    const errors = [];

    if (!userData.name?.trim()) errors.push({ field: "name", message: "Nama wajib diisi" });
    if (!userData.email?.trim()) errors.push({ field: "email", message: "Email wajib diisi" });
    if (!userData.password) errors.push({ field: "password", message: "Password wajib diisi" });
    if (userData.password?.length < 8) {
      errors.push({ field: "password", message: "Password minimal 8 karakter" });
    }

    if (errors.length > 0) {
      throw new ValidationError("Data tidak valid", errors);
    }

    // ── Hash password sebelum disimpan ────────────────────────
    // Salt rounds 12: keseimbangan antara keamanan dan performa
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // ── Buat user ─────────────────────────────────────────────
    const user = await userRepository.create({
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      role: userData.role || "MEMBER", // Default role: MEMBER
      isActive: true,
    });

    return user.toPublicObject();
  }

  /**
   * Use Case: Update data user
   *
   * @param {string} userId - ID user yang diupdate
   * @param {object} updateData - Data yang akan diperbarui
   * @param {User} currentUser - User yang melakukan update
   */
  async updateUser(userId, updateData, currentUser) {
    // User hanya bisa update profil sendiri, admin bisa update siapapun
    if (userId !== currentUser.id && !currentUser.isAdmin()) {
      throw new ForbiddenError("Anda tidak bisa mengubah profil pengguna lain");
    }

    // Hanya admin yang bisa mengubah role
    if (updateData.role && !currentUser.isAdmin()) {
      throw new ForbiddenError("Hanya Administrator yang bisa mengubah role pengguna");
    }

    // Field yang tidak boleh diupdate via endpoint ini
    delete updateData.password;  // Password harus diubah via changePassword
    delete updateData.id;         // ID tidak bisa diubah

    const user = await userRepository.update(userId, updateData);
    return user.toPublicObject();
  }

  /**
   * Use Case: Ganti password user
   *
   * @param {string} userId - ID user
   * @param {object} passwords - { currentPassword, newPassword }
   * @param {User} currentUser - User yang login
   */
  async changePassword(userId, { currentPassword, newPassword }, currentUser) {
    // Hanya bisa ganti password sendiri
    if (userId !== currentUser.id) {
      throw new ForbiddenError("Anda hanya bisa mengubah password sendiri");
    }

    // Validasi password baru
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError("Password baru minimal 8 karakter");
    }

    // Ambil user dengan password (dari findByEmail)
    const userWithPassword = await userRepository.findByEmail(currentUser.email);

    // Verifikasi password lama
    const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);

    if (!isPasswordValid) {
      throw new ValidationError("Password saat ini tidak benar");
    }

    // Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password di database
    await userRepository.update(userId, { password: hashedNewPassword });

    return { message: "Password berhasil diubah" };
  }

  /**
   * Use Case: Nonaktifkan/hapus user
   * Hanya admin yang bisa melakukan ini
   */
  async deleteUser(userId, currentUser) {
    if (!currentUser.isAdmin()) {
      throw new ForbiddenError("Hanya Administrator yang bisa menghapus pengguna");
    }

    // Admin tidak bisa hapus dirinya sendiri
    if (userId === currentUser.id) {
      throw new ValidationError("Anda tidak bisa menghapus akun Anda sendiri");
    }

    await userRepository.delete(userId);

    return { message: "Pengguna berhasil dinonaktifkan" };
  }
}

// Export singleton instance
export const userService = new UserService();
