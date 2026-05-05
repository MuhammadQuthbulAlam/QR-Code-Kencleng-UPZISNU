// ============================================================
// src/interfaces/repositories/IUserRepository.js
// Interface Repository: User
//
// Dalam Clean Architecture, Interface mendefinisikan "kontrak"
// antara Domain/Application layer dengan Infrastructure layer.
//
// Domain Layer TIDAK tahu bagaimana data disimpan (Prisma, MySQL, dll).
// Domain Layer hanya tahu bahwa ada "sesuatu" yang bisa:
// - Mencari user berdasarkan ID
// - Menyimpan user baru
// - dll.
//
// Implementasi nyatanya ada di src/modules/users/infrastructure/
// ============================================================

/**
 * IUserRepository - Interface (kontrak) untuk User Repository
 *
 * Semua implementasi repository User HARUS memiliki
 * method-method yang terdaftar di class ini.
 *
 * JavaScript tidak memiliki interface native seperti TypeScript,
 * jadi kita simulasikan dengan class yang throw error di setiap method.
 * Ini memaksa subclass untuk override semua method.
 */
export class IUserRepository {
  /**
   * Mencari user berdasarkan ID unik
   * @param {string} id - User ID (CUID)
   * @returns {Promise<User|null>} User entity atau null jika tidak ditemukan
   */
  async findById(id) {
    throw new Error("Method 'findById' harus diimplementasikan");
  }

  /**
   * Mencari user berdasarkan alamat email
   * Digunakan untuk proses login dan cek duplikasi email
   * @param {string} email - Email address
   * @returns {Promise<User|null>} User entity atau null
   */
  async findByEmail(email) {
    throw new Error("Method 'findByEmail' harus diimplementasikan");
  }

  /**
   * Mengambil semua user dengan pagination dan filter
   * @param {object} options - Opsi query
   * @param {number} options.page - Nomor halaman (mulai 1)
   * @param {number} options.limit - Jumlah item per halaman
   * @param {string} options.search - Keyword pencarian
   * @param {string} options.role - Filter berdasarkan role
   * @returns {Promise<{ users: User[], total: number }>}
   */
  async findAll({ page, limit, search, role } = {}) {
    throw new Error("Method 'findAll' harus diimplementasikan");
  }

  /**
   * Membuat user baru di database
   * @param {object} userData - Data user baru (termasuk password yang sudah di-hash)
   * @returns {Promise<User>} User entity yang baru dibuat
   */
  async create(userData) {
    throw new Error("Method 'create' harus diimplementasikan");
  }

  /**
   * Memperbarui data user
   * @param {string} id - ID user yang akan diupdate
   * @param {object} updateData - Data yang akan diperbarui (partial)
   * @returns {Promise<User>} User entity yang sudah diperbarui
   */
  async update(id, updateData) {
    throw new Error("Method 'update' harus diimplementasikan");
  }

  /**
   * Menghapus user dari database
   * @param {string} id - ID user yang akan dihapus
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error("Method 'delete' harus diimplementasikan");
  }

  /**
   * Mengecek apakah email sudah terdaftar
   * @param {string} email
   * @param {string} excludeId - ID user yang dikecualikan (untuk update)
   * @returns {Promise<boolean>}
   */
  async isEmailExists(email, excludeId = null) {
    throw new Error("Method 'isEmailExists' harus diimplementasikan");
  }
}
