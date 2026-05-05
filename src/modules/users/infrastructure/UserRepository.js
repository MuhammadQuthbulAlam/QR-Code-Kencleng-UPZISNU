// ============================================================
// src/modules/users/infrastructure/UserRepository.js
// Implementasi konkret dari IUserRepository menggunakan Prisma
//
// Layer Infrastructure bertanggung jawab untuk:
// - Komunikasi dengan database (via Prisma)
// - Konversi data Prisma -> Domain Entity
// - Query optimization (select hanya field yang dibutuhkan)
// ============================================================

import { db } from "@/infrastructure/database/db";
import { User } from "../domain/User";
import { IUserRepository } from "@/interfaces/repositories/IUserRepository";
import { NotFoundError, ConflictError } from "@/core/errors/AppError";

/**
 * UserRepository - Implementasi konkret IUserRepository
 * Menggunakan Prisma ORM untuk berinteraksi dengan PostgreSQL
 */
export class UserRepository extends IUserRepository {
  // ── Field selector: hanya ambil field yang diperlukan ───────
  // Tidak pernah ambil 'password' untuk keamanan
  // (password hanya diambil di method khusus untuk autentikasi)
  #defaultSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    avatar: true,
    createdAt: true,
    updatedAt: true,
    // Tidak include password!
  };

  /**
   * Mencari user berdasarkan ID
   */
  async findById(id) {
    const user = await db.user.findUnique({
      where: { id },
      select: this.#defaultSelect,
    });

    // Konversi dari data Prisma ke Domain Entity
    return user ? User.fromPrisma(user) : null;
  }

  /**
   * Mencari user berdasarkan email (DENGAN password untuk auth)
   * Method ini return raw data, bukan Domain Entity
   * karena password dibutuhkan untuk verifikasi login
   */
  async findByEmail(email) {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() }, // Normalize email ke lowercase
      select: {
        ...this.#defaultSelect,
        password: true, // Hanya di sini password diambil
      },
    });

    return user;
  }

  /**
   * Mengambil semua user dengan pagination, search, dan filter
   */
  async findAll({ page = 1, limit = 10, search = "", role = null } = {}) {
    // Hitung offset untuk pagination
    const offset = (page - 1) * limit;

    // Bangun kondisi WHERE secara dinamis
    const where = {
      // Filter berdasarkan keyword search (nama atau email)
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },   // Case-insensitive search nama
          { email: { contains: search, mode: "insensitive" } },  // Case-insensitive search email
        ],
      }),
      // Filter berdasarkan role jika ada
      ...(role && { role }),
    };

    // Jalankan dua query sekaligus untuk efisiensi (data + total count)
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: this.#defaultSelect,
        orderBy: { createdAt: "desc" }, // Urutkan dari yang terbaru
        skip: offset,
        take: limit,
      }),
      db.user.count({ where }), // Total tanpa pagination (untuk kalkulasi totalPages)
    ]);

    return {
      users: users.map(User.fromPrisma), // Konversi semua ke Domain Entity
      total,
    };
  }

  /**
   * Membuat user baru
   * Data yang masuk harus sudah include password yang ter-hash
   */
  async create(userData) {
    // Cek duplikasi email sebelum create
    const existingUser = await db.user.findUnique({
      where: { email: userData.email.toLowerCase() },
      select: { id: true }, // Hanya perlu ID untuk cek eksistensi
    });

    if (existingUser) {
      throw new ConflictError("Email sudah terdaftar, gunakan email lain");
    }

    // Buat user baru di database
    const user = await db.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(), // Selalu simpan email lowercase
      },
      select: this.#defaultSelect,
    });

    return User.fromPrisma(user);
  }

  /**
   * Memperbarui data user
   */
  async update(id, updateData) {
    // Pastikan user ada sebelum update
    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("User");
    }

    // Jika email diupdate, normalize ke lowercase
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: this.#defaultSelect,
    });

    return User.fromPrisma(user);
  }

  /**
   * Menghapus user (soft delete = set isActive = false)
   * Hard delete jarang dilakukan untuk menjaga integritas data
   */
  async delete(id) {
    // Cek keberadaan user
    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("User");
    }

    // Soft delete: nonaktifkan akun, tidak hapus permanen
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Cek apakah email sudah terdaftar
   */
  async isEmailExists(email, excludeId = null) {
    const user = await db.user.findFirst({
      where: {
        email: email.toLowerCase(),
        // Kecualikan user dengan ID tertentu (untuk update profile)
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });

    return !!user; // Konversi ke boolean
  }
}

// Export instance tunggal (Singleton) agar tidak perlu instantiate ulang
export const userRepository = new UserRepository();
