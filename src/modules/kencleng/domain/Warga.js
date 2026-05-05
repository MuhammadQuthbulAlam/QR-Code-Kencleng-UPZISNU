// ============================================================
// src/modules/kencleng/domain/Warga.js
// Domain Entity: Warga
//
// Merepresentasikan satu warga penerima kencleng.
// Layer ini murni business logic — tidak ada import Prisma,
// tidak ada HTTP, tidak ada I/O apapun.
// ============================================================

/**
 * Warga — Domain Entity
 *
 * Satu instance = satu warga dengan kencleng NU.
 * Berisi semua property dan aturan bisnis terkait data warga.
 */
export class Warga {
  constructor({
    id,
    no_kencleng,
    nama,
    ranting,
    alamat,
    qr_code,
    qr_image,
    isActive,
    importBatch,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.no_kencleng = no_kencleng;
    this.nama = nama;
    this.ranting = ranting;
    this.alamat = alamat;
    this.qr_code = qr_code;
    this.qr_image = qr_image;
    this.isActive = isActive ?? true;
    this.importBatch = importBatch ?? null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // ── Business Rules ───────────────────────────────────────────

  /**
   * Cek apakah data warga lengkap dan siap digunakan
   * (semua field wajib terisi)
   */
  isComplete() {
    return Boolean(
      this.no_kencleng?.trim() &&
      this.nama?.trim() &&
      this.ranting?.trim() &&
      this.alamat?.trim() &&
      this.qr_code,
    );
  }

  /**
   * Cek apakah warga masih aktif (kencleng belum ditarik)
   */
  isActiveWarga() {
    return this.isActive === true;
  }

  /**
   * Mendapatkan inisial nama untuk avatar fallback UI
   * Contoh: "Ahmad Fauzi" → "AF"
   */
  getInitials() {
    return this.nama
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
  }

  /**
   * Format tampilan: nama (no_kencleng)
   * Contoh: "Ahmad Fauzi (0042)"
   */
  getDisplayLabel() {
    return `${this.nama} (${this.no_kencleng})`;
  }

  /**
   * Konversi ke plain object untuk respons API
   * Menyertakan semua field kecuali qr_image (besar)
   * agar list endpoint tidak berat.
   *
   * Gunakan toDetailObject() jika qr_image dibutuhkan.
   */
  toPublicObject() {
    return {
      id: this.id,
      no_kencleng: this.no_kencleng,
      nama: this.nama,
      ranting: this.ranting,
      alamat: this.alamat,
      qr_code: this.qr_code,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // qr_image TIDAK disertakan di list untuk hemat bandwidth
    };
  }

  /**
   * Konversi ke plain object LENGKAP termasuk qr_image
   * Digunakan untuk endpoint detail satu warga
   */
  toDetailObject() {
    return {
      ...this.toPublicObject(),
      qr_image: this.qr_image, // base64 PNG Data URL
      importBatch: this.importBatch,
    };
  }

  // ── Static Factory ───────────────────────────────────────────

  /**
   * Membuat Warga entity dari data mentah Prisma
   *
   * @param {object} prismaWarga - Row dari tabel warga
   * @returns {Warga}
   */
  static fromPrisma(prismaWarga) {
    return new Warga({
      id: prismaWarga.id,
      no_kencleng: prismaWarga.no_kencleng,
      nama: prismaWarga.nama,
      ranting: prismaWarga.ranting,
      alamat: prismaWarga.alamat,
      qr_code: prismaWarga.qr_code,
      qr_image: prismaWarga.qr_image,
      isActive: prismaWarga.isActive,
      importBatch: prismaWarga.importBatch,
      createdAt: prismaWarga.createdAt,
      updatedAt: prismaWarga.updatedAt,
    });
  }
}
