// ============================================================
// src/modules/auth/domain/AuthSession.js
// Domain: Auth Session
//
// Representasi domain dari sesi autentikasi.
// Berisi tipe, konstanta, dan logika bisnis terkait session.
// ============================================================

// ── Konstanta Role ────────────────────────────────────────────
export const ROLES = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  MEMBER: "MEMBER",
};

// ── Hierarki role (semakin tinggi index, semakin tinggi akses) ─
export const ROLE_HIERARCHY = [ROLES.MEMBER, ROLES.MODERATOR, ROLES.ADMIN];

/**
 * AuthSession - Domain entity yang merepresentasikan user yang sedang login
 * Dibangun dari data session NextAuth
 */
export class AuthSession {
  constructor({ id, email, name, role, isActive, avatar }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.role = role || ROLES.MEMBER;
    this.isActive = isActive !== false; // default true
    this.avatar = avatar || null;
  }

  // ── Business Rules ───────────────────────────────────────────

  /** Cek apakah user adalah Admin */
  isAdmin() {
    return this.role === ROLES.ADMIN;
  }

  /** Cek apakah user adalah Moderator atau lebih tinggi */
  isModerator() {
    return this.role === ROLES.MODERATOR || this.isAdmin();
  }

  /**
   * Cek apakah user memiliki role yang cukup
   * @param {string} requiredRole - Role minimum yang dibutuhkan
   */
  hasRole(requiredRole) {
    const userRoleIndex = ROLE_HIERARCHY.indexOf(this.role);
    const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
    return userRoleIndex >= requiredRoleIndex;
  }

  /** Mendapatkan initials dari nama (contoh: "Ahmad Fauzi" → "AF") */
  getInitials() {
    if (!this.name) return "?";
    return this.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  /** Konversi ke plain object yang aman untuk dikirim ke client */
  toObject() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      avatar: this.avatar,
      initials: this.getInitials(),
    };
  }

  /** Factory method dari session NextAuth */
  static fromNextAuthSession(session) {
    if (!session?.user) return null;
    return new AuthSession(session.user);
  }
}
