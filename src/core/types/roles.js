// ============================================================
// src/core/types/roles.js
// Definisi Role dan Permission System
//
// Semua role, permission, dan helper fungsi untuk
// Role-Based Access Control (RBAC) didefinisikan di sini.
//
// Dua role utama:
//   super_admin — Akses penuh ke seluruh sistem
//   petugas     — Akses operasional terbatas
// ============================================================

// ── Daftar Role yang Valid ───────────────────────────────────
/**
 * Enum role yang tersedia dalam sistem.
 * Gunakan konstanta ini (bukan string langsung) untuk mencegah typo.
 *
 * @example
 * if (user.role === ROLES.SUPER_ADMIN) { ... }
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin", // Administrator tertinggi
  PETUGAS: "petugas", // Petugas/operator lapangan
});

// ── Daftar Semua Role (untuk validasi) ──────────────────────
export const ALL_ROLES = Object.values(ROLES);

// ── Definisi Permission ──────────────────────────────────────
/**
 * Semua permission yang ada dalam sistem.
 * Format: "resource:action" (e.g., "user:create")
 *
 * Konvensi penamaan:
 * - resource: noun (users, posts, reports)
 * - action: verb (create, read, update, delete, manage)
 */
export const PERMISSIONS = Object.freeze({
  // ── User Management ──────────────────────────────────────
  USER_CREATE: "user:create", // Membuat user baru
  USER_READ: "user:read", // Melihat data user
  USER_UPDATE: "user:update", // Mengubah data user
  USER_DELETE: "user:delete", // Menghapus/menonaktifkan user
  USER_MANAGE: "user:manage", // Kelola role & permission user

  // ── Post/Content Management ───────────────────────────────
  POST_CREATE: "post:create", // Membuat artikel baru
  POST_READ: "post:read", // Melihat artikel
  POST_UPDATE: "post:update", // Mengedit artikel
  POST_DELETE: "post:delete", // Menghapus artikel
  POST_PUBLISH: "post:publish", // Mempublikasikan artikel

  // ── System Settings ───────────────────────────────────────
  SETTINGS_READ: "settings:read", // Melihat pengaturan sistem
  SETTINGS_UPDATE: "settings:update", // Mengubah pengaturan sistem

  // ── Reports ───────────────────────────────────────────────
  REPORT_READ: "report:read", // Melihat laporan
  REPORT_EXPORT: "report:export", // Mengekspor laporan
});

// ── Mapping Role → Permissions ───────────────────────────────
/**
 * Mendefinisikan PERMISSION APA SAJA yang dimiliki setiap ROLE.
 *
 * super_admin → semua permission (full access)
 * petugas     → permission terbatas (read + content management)
 */
export const ROLE_PERMISSIONS = Object.freeze({
  /**
   * SUPER_ADMIN: akses penuh ke semua fitur sistem
   * - Kelola user & role
   * - Kelola seluruh konten
   * - Akses pengaturan sistem
   * - Lihat semua laporan
   */
  [ROLES.SUPER_ADMIN]: [
    // User management (full)
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_MANAGE,
    // Content management (full)
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_UPDATE,
    PERMISSIONS.POST_DELETE,
    PERMISSIONS.POST_PUBLISH,
    // System settings (full)
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    // Reports (full)
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT,
  ],

  /**
   * PETUGAS: akses operasional untuk pekerjaan sehari-hari
   * - Bisa lihat & kelola konten (tapi tidak bisa publish sendiri)
   * - Bisa lihat data user (tapi tidak bisa kelola)
   * - Tidak bisa akses pengaturan sistem
   * - Bisa lihat laporan tapi tidak bisa export
   */
  [ROLES.PETUGAS]: [
    // User management (read-only)
    PERMISSIONS.USER_READ,
    // Content management (terbatas, tanpa publish)
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_UPDATE,
    // Reports (read-only)
    PERMISSIONS.REPORT_READ,
  ],
});

// ── Role Hierarchy ────────────────────────────────────────────
/**
 * Urutan hierarki role dari terendah ke tertinggi.
 * Digunakan untuk perbandingan "apakah role A lebih tinggi dari B".
 */
export const ROLE_HIERARCHY = {
  [ROLES.PETUGAS]: 1, // Level terendah
  [ROLES.SUPER_ADMIN]: 2, // Level tertinggi
};

// ── Helper Functions ─────────────────────────────────────────

/**
 * Cek apakah sebuah role memiliki permission tertentu
 *
 * @param {string} role - Role yang dicek (e.g., ROLES.PETUGAS)
 * @param {string} permission - Permission yang dibutuhkan
 * @returns {boolean}
 *
 * @example
 * hasPermission(ROLES.PETUGAS, PERMISSIONS.USER_DELETE) // false
 * hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.USER_DELETE) // true
 */
export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Cek apakah role memiliki SEMUA permission yang dibutuhkan
 *
 * @param {string} role
 * @param {string[]} requiredPermissions
 * @returns {boolean}
 *
 * @example
 * hasAllPermissions(ROLES.PETUGAS, [PERMISSIONS.POST_READ, PERMISSIONS.POST_CREATE]) // true
 * hasAllPermissions(ROLES.PETUGAS, [PERMISSIONS.POST_READ, PERMISSIONS.USER_DELETE]) // false
 */
export function hasAllPermissions(role, requiredPermissions) {
  return requiredPermissions.every((perm) => hasPermission(role, perm));
}

/**
 * Cek apakah role memiliki MINIMAL SATU dari permission yang dibutuhkan
 *
 * @param {string} role
 * @param {string[]} anyPermissions
 * @returns {boolean}
 */
export function hasAnyPermission(role, anyPermissions) {
  return anyPermissions.some((perm) => hasPermission(role, perm));
}

/**
 * Mendapatkan semua permission yang dimiliki role tertentu
 *
 * @param {string} role
 * @returns {string[]} Array permission
 */
export function getPermissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

/**
 * Cek apakah role A lebih tinggi dari role B dalam hierarki
 *
 * @param {string} roleA - Role yang dicek
 * @param {string} roleB - Role pembanding
 * @returns {boolean}
 *
 * @example
 * isRoleHigherThan(ROLES.SUPER_ADMIN, ROLES.PETUGAS) // true
 * isRoleHigherThan(ROLES.PETUGAS, ROLES.SUPER_ADMIN) // false
 */
export function isRoleHigherThan(roleA, roleB) {
  return (ROLE_HIERARCHY[roleA] || 0) > (ROLE_HIERARCHY[roleB] || 0);
}

/**
 * Validasi apakah string adalah role yang valid
 *
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  return ALL_ROLES.includes(role);
}

/**
 * Mendapatkan label display untuk sebuah role (dalam Bahasa Indonesia)
 *
 * @param {string} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  const labels = {
    [ROLES.SUPER_ADMIN]: "Super Administrator",
    [ROLES.PETUGAS]: "Petugas",
  };
  return labels[role] || role;
}
