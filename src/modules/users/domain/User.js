// ============================================================
// src/modules/users/domain/User.js
// Domain Entity: User
//
// Dalam Clean Architecture, Domain Layer adalah inti aplikasi.
// Entity berisi business rules dan tidak bergantung pada
// framework, database, atau library luar.
// ============================================================

/**
 * User Domain Entity
 *
 * Merepresentasikan "User" dalam konteks bisnis aplikasi.
 * Class ini BUKAN model Prisma - ini adalah pure JavaScript class
 * yang berisi logika bisnis terkait User.
 */
export class User {
  constructor({ id, email, name, role, isActive, createdAt, avatar }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.role = role;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.avatar = avatar || null; // Avatar opsional, default null
  }

  // ── Business Rules (Domain Logic) ───────────────────────────

  /**
   * Cek apakah user adalah Administrator
   * Admin memiliki akses penuh ke seluruh sistem
   */
  isAdmin() {
    return this.role === "ADMIN";
  }

  /**
   * Cek apakah user adalah Moderator
   * Moderator bisa kelola konten tapi tidak bisa kelola user
   */
  isModerator() {
    return this.role === "MODERATOR";
  }

  /**
   * Cek apakah user bisa melakukan aksi tertentu
   * Implementasi Role-Based Access Control (RBAC) sederhana
   *
   * @param {string} action - Aksi yang ingin dilakukan (e.g., 'delete:user')
   * @returns {boolean}
   */
  can(action) {
    // Daftar izin berdasarkan role
    const permissions = {
      ADMIN: [
        "create:user", "read:user", "update:user", "delete:user",
        "create:post", "read:post", "update:post", "delete:post",
        "manage:settings",
      ],
      MODERATOR: [
        "create:post", "read:post", "update:post", "delete:post",
        "read:user",
      ],
      MEMBER: [
        "read:post",
      ],
    };

    const allowedActions = permissions[this.role] || [];
    return allowedActions.includes(action);
  }

  /**
   * Mendapatkan initial/avatar fallback dari nama user
   * Digunakan saat foto profil tidak tersedia
   * Contoh: "Ahmad Fauzi" -> "AF"
   */
  getInitials() {
    return this.name
      .split(" ")
      .map((word) => word[0])           // Ambil huruf pertama setiap kata
      .join("")
      .toUpperCase()
      .substring(0, 2);                 // Maksimal 2 karakter
  }

  /**
   * Konversi entity ke plain object untuk serialisasi
   * Digunakan saat mengirim data ke client (tanpa field sensitif)
   *
   * @returns {object} Data user yang aman untuk dikirim ke client
   */
  toPublicObject() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      avatar: this.avatar,
      initials: this.getInitials(), // Tambahkan initials untuk UI
      createdAt: this.createdAt,
    };
  }

  // ── Static Factory Methods ────────────────────────────────────

  /**
   * Membuat User entity dari data Prisma/database
   * Factory method untuk konversi dari persistence layer ke domain layer
   *
   * @param {object} prismaUser - Data mentah dari Prisma
   * @returns {User} Domain entity
   */
  static fromPrisma(prismaUser) {
    return new User({
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      role: prismaUser.role,
      isActive: prismaUser.isActive,
      createdAt: prismaUser.createdAt,
      avatar: prismaUser.avatar,
    });
  }
}
