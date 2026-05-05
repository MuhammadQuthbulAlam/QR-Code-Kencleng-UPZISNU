// ============================================================
// src/modules/kencleng/infrastructure/WargaRepository.js
// Infrastructure Layer: Prisma Repository untuk Warga
//
// Semua operasi database warga ada di sini.
// Layer ini TIDAK mengandung business logic — hanya I/O database.
// ============================================================

import { db } from "@/infrastructure/database/db";
import { Warga } from "../domain/Warga";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";

export class WargaRepository {
  // ── Default select fields ───────────────────────────────────
  // qr_image TIDAK disertakan secara default (field besar / base64)
  // karena akan memperlambat query list. Ambil hanya saat dibutuhkan.
  #selectDefault = {
    id: true,
    no_kencleng: true,
    nama: true,
    ranting: true,
    alamat: true,
    qr_code: true,
    isActive: true,
    importBatch: true,
    createdAt: true,
    updatedAt: true,
    // qr_image: false — sengaja di-exclude dari list
  };

  // Select lengkap termasuk qr_image (untuk detail / cetak)
  #selectFull = { ...this.#selectDefault, qr_image: true };

  // ── READ ─────────────────────────────────────────────────────

  /**
   * Ambil semua warga dengan pagination, search, dan filter
   *
   * @param {object} opts
   * @param {number} opts.page    - Halaman (mulai 1)
   * @param {number} opts.limit   - Item per halaman
   * @param {string} opts.search  - Keyword (nama / no_kencleng)
   * @param {string} opts.ranting - Filter ranting
   * @param {boolean|null} opts.active - Filter status aktif
   * @returns {Promise<{ data: Warga[], total: number }>}
   */
  async findAll({
    page = 1,
    limit = 20,
    search = "",
    ranting = null,
    active = null,
  } = {}) {
    const offset = (page - 1) * limit;

    // Bangun kondisi WHERE secara dinamis
    const where = {
      // Pencarian teks: nama ATAU no_kencleng mengandung keyword
      ...(search && {
        OR: [
          { nama: { contains: search, mode: "insensitive" } },
          { no_kencleng: { contains: search, mode: "insensitive" } },
          { ranting: { contains: search, mode: "insensitive" } },
        ],
      }),
      // Filter ranting (exact match, case-insensitive)
      ...(ranting && { ranting: { equals: ranting, mode: "insensitive" } }),
      // Filter status aktif
      ...(active !== null && { isActive: active }),
    };

    // Jalankan dua query paralel: data halaman ini + total count
    const [rows, total] = await Promise.all([
      db.warga.findMany({
        where,
        select: this.#selectDefault,
        orderBy: [
          { no_kencleng: "asc" }, // Urutkan berdasarkan nomor kencleng
        ],
        skip: offset,
        take: limit,
      }),
      db.warga.count({ where }),
    ]);

    return {
      data: rows.map(Warga.fromPrisma), // Konversi ke domain entity
      total,
    };
  }

  /**
   * Ambil satu warga berdasarkan ID (termasuk qr_image)
   *
   * @param {string} id
   * @returns {Promise<Warga|null>}
   */
  async findById(id) {
    const row = await db.warga.findUnique({
      where: { id },
      select: this.#selectFull, // Full select termasuk qr_image
    });
    return row ? Warga.fromPrisma(row) : null;
  }

  /**
   * Ambil warga berdasarkan no_kencleng
   *
   * @param {string} noKencleng
   * @returns {Promise<Warga|null>}
   */
  async findByNoKencleng(noKencleng) {
    const row = await db.warga.findUnique({
      where: { no_kencleng: noKencleng },
      select: this.#selectFull,
    });
    return row ? Warga.fromPrisma(row) : null;
  }

  /**
   * Ambil warga berdasarkan qr_code (untuk scan QR)
   *
   * @param {string} qrCode - e.g. "UPZ-0042"
   * @returns {Promise<Warga|null>}
   */
  async findByQrCode(qrCode) {
    const row = await db.warga.findUnique({
      where: { qr_code: qrCode },
      select: this.#selectFull,
    });
    return row ? Warga.fromPrisma(row) : null;
  }

  /**
   * Ambil daftar semua ranting yang ada (untuk dropdown filter)
   *
   * @returns {Promise<string[]>}
   */
  async findAllRanting() {
    const rows = await db.warga.findMany({
      where: { isActive: true },
      select: { ranting: true },
      distinct: ["ranting"], // Distinct = tidak duplikat
      orderBy: { ranting: "asc" },
    });
    return rows.map((r) => r.ranting);
  }

  // ── WRITE ────────────────────────────────────────────────────

  /**
   * Buat satu warga baru
   * QR code dan gambar sudah harus tersedia sebelum dipanggil.
   *
   * @param {object} data - { no_kencleng, nama, ranting, alamat, qr_code, qr_image, importBatch? }
   * @returns {Promise<Warga>}
   * @throws {ConflictError} jika no_kencleng atau qr_code sudah ada
   */
  async create(data) {
    // Cek duplikasi no_kencleng
    const dupKencleng = await db.warga.findUnique({
      where: { no_kencleng: data.no_kencleng },
      select: { id: true },
    });
    if (dupKencleng) {
      throw new ConflictError(
        `Nomor kencleng "${data.no_kencleng}" sudah terdaftar`,
      );
    }

    // Cek duplikasi qr_code
    const dupQr = await db.warga.findUnique({
      where: { qr_code: data.qr_code },
      select: { id: true },
    });
    if (dupQr) {
      throw new ConflictError(`QR code "${data.qr_code}" sudah terdaftar`);
    }

    const row = await db.warga.create({
      data: { ...data, isActive: true },
      select: this.#selectFull,
    });

    return Warga.fromPrisma(row);
  }

  /**
   * Import banyak warga sekaligus dalam satu transaksi database.
   *
   * Transaksi memastikan atomisitas:
   * kalau ada satu error di tengah jalan, semua rollback.
   *
   * @param {Array<object>} dataArray - Array data warga lengkap
   * @returns {Promise<{ created: number, skipped: number, skippedItems: string[] }>}
   */
  async createMany(dataArray) {
    let created = 0;
    const skippedItems = []; // Nomor kencleng yang di-skip (sudah ada)

    // Ambil semua no_kencleng yang sudah ada dalam DB (untuk bulk-check)
    const existingCodes = await db.warga.findMany({
      where: {
        no_kencleng: { in: dataArray.map((d) => d.no_kencleng) },
      },
      select: { no_kencleng: true, qr_code: true },
    });

    // Buat Set untuk O(1) lookup
    const existingNoKencleng = new Set(existingCodes.map((e) => e.no_kencleng));
    const existingQrCodes = new Set(existingCodes.map((e) => e.qr_code));

    // Filter: hanya data yang belum ada
    const toInsert = dataArray.filter((d) => {
      if (
        existingNoKencleng.has(d.no_kencleng) ||
        existingQrCodes.has(d.qr_code)
      ) {
        skippedItems.push(d.no_kencleng); // Catat yang di-skip
        return false;
      }
      return true;
    });

    if (toInsert.length > 0) {
      // createMany jauh lebih cepat dari create satu per satu
      // karena hanya satu SQL statement (INSERT INTO ... VALUES (...), (...), ...)
      const result = await db.warga.createMany({
        data: toInsert,
        skipDuplicates: true, // Extra safety: skip jika masih ada duplikat
      });
      created = result.count;
    }

    return {
      created,
      skipped: skippedItems.length,
      skippedItems, // Daftar nomor yang di-skip (untuk laporan ke user)
    };
  }

  /**
   * Update data warga
   *
   * @param {string} id
   * @param {object} updateData - Field yang diupdate (partial)
   * @returns {Promise<Warga>}
   */
  async update(id, updateData) {
    // Pastikan warga ada
    const existing = await db.warga.findUnique({
      where: { id },
      select: { id: true, no_kencleng: true },
    });
    if (!existing) throw new NotFoundError("Warga");

    // Jika no_kencleng diubah, cek tidak duplikat
    if (
      updateData.no_kencleng &&
      updateData.no_kencleng !== existing.no_kencleng
    ) {
      const dup = await db.warga.findFirst({
        where: { no_kencleng: updateData.no_kencleng, NOT: { id } },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictError(
          `Nomor kencleng "${updateData.no_kencleng}" sudah digunakan warga lain`,
        );
      }
    }

    const row = await db.warga.update({
      where: { id },
      data: updateData,
      select: this.#selectFull,
    });

    return Warga.fromPrisma(row);
  }

  /**
   * Hapus warga permanen dari database
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const existing = await db.warga.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Warga");

    await db.warga.delete({ where: { id } });
  }

  // ── AGGREGATE ───────────────────────────────────────────────

  /**
   * Statistik ringkasan untuk dashboard
   *
   * @returns {Promise<{ total, active, inactive, totalRanting }>}
   */
  async getStats() {
    const [total, active, rantingCount] = await Promise.all([
      db.warga.count(),
      db.warga.count({ where: { isActive: true } }),
      db.warga.findMany({
        where: { isActive: true },
        select: { ranting: true },
        distinct: ["ranting"],
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      totalRanting: rantingCount.length,
    };
  }

  /**
   * No kencleng terbesar yang ada (untuk auto-increment saat import)
   *
   * @returns {Promise<number>} Angka terbesar, atau 0 jika belum ada data
   */
  async getMaxNoKencleng() {
    // Ambil semua no_kencleng lalu cari angka terbesar
    const rows = await db.warga.findMany({
      select: { no_kencleng: true },
      orderBy: { no_kencleng: "asc" },
    });

    if (rows.length === 0) return 0;

    // Ekstrak angka dari setiap no_kencleng dan cari yang terbesar
    const numbers = rows
      .map((r) => parseInt(r.no_kencleng.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));

    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }
}

// Export singleton instance
export const wargaRepository = new WargaRepository();
