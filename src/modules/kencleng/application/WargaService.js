// ============================================================
// src/modules/kencleng/application/WargaService.js
// Application Layer: Warga Service
//
// Berisi semua use case bisnis untuk modul kencleng:
// - listWarga           : Ambil daftar warga (pagination + filter)
// - getWargaById        : Detail satu warga + QR image
// - createWarga         : Tambah warga manual (auto-generate QR)
// - updateWarga         : Edit data warga
// - deleteWarga         : Hapus warga
// - importFromExcel     : Import massal dari file Excel
// - regenerateQrCode    : Buat ulang QR jika ada error
// - getStats            : Statistik dashboard
// ============================================================

import { wargaRepository } from "../infrastructure/WargaRepository";
import { generateQrCode, formatQrCode } from "@/core/qrcode/qrGenerator";
import { parseExcelBuffer, createExcelTemplate } from "./excelParser";
import {
  createWargaSchema,
  updateWargaSchema,
  formatZodErrors,
} from "../domain/wargaSchema";
import { ValidationError, NotFoundError } from "@/core/errors/AppError";
import { getPaginationMeta } from "@/core/utils";
import { db } from "@/infrastructure/database/db";

export class WargaService {
  // ── USE CASE: List Warga ────────────────────────────────────

  /**
   * Ambil daftar warga dengan pagination, search, dan filter
   *
   * @param {object} query - Parameter dari request query string
   * @returns {Promise<{ data, total, page, limit, totalPages, ... }>}
   */
  async listWarga(query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const search = query.search?.trim() || "";
    const ranting = query.ranting?.trim() || null;
    // Konversi string "true"/"false" ke boolean, atau null jika tidak ada
    const active =
      query.active === "true" ? true : query.active === "false" ? false : null;

    const { data, total } = await wargaRepository.findAll({
      page,
      limit,
      search,
      ranting,
      active,
    });

    const meta = getPaginationMeta(total, page, limit);

    return {
      data: data.map((w) => w.toPublicObject()), // Strip qr_image dari list
      ...meta,
    };
  }

  // ── USE CASE: Get Detail Warga ──────────────────────────────

  /**
   * Ambil detail lengkap satu warga termasuk gambar QR
   *
   * @param {string} id - ID warga
   * @returns {Promise<object>} Data warga lengkap + qr_image
   */
  async getWargaById(id) {
    const warga = await wargaRepository.findById(id);
    if (!warga) throw new NotFoundError("Warga");

    return warga.toDetailObject(); // Termasuk qr_image
  }

  /**
   * Cari warga berdasarkan hasil scan QR code
   *
   * @param {string} qrCode - String kode dari hasil scan (e.g., "UPZ-0042")
   * @returns {Promise<object>}
   */
  async getWargaByQrCode(qrCode) {
    const warga = await wargaRepository.findByQrCode(qrCode);
    if (!warga) throw new NotFoundError("Warga dengan QR code tersebut");

    return warga.toDetailObject();
  }

  // ── USE CASE: Create Warga ──────────────────────────────────

  /**
   * Tambah warga baru secara manual
   *
   * Alur:
   * 1. Validasi input dengan Zod
   * 2. Format no_kencleng
   * 3. Generate QR code (kode + gambar PNG)
   * 4. Simpan ke database
   *
   * @param {object} input - { no_kencleng, nama, ranting, alamat }
   * @returns {Promise<object>} Warga yang baru dibuat (termasuk qr_image)
   */
  async createWarga(input) {
    // ── Validasi input ──────────────────────────────────────
    const result = createWargaSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(
        "Data warga tidak valid",
        formatZodErrors(result.error),
      );
    }

    const validated = result.data;

    // ── Generate QR Code ────────────────────────────────────
    // formatQrCode memastikan no_kencleng jadi "UPZ-XXXX"
    const { qrCode, qrImage } = await generateQrCode(validated.no_kencleng);

    // ── Simpan ke database ──────────────────────────────────
    const warga = await wargaRepository.create({
      no_kencleng: validated.no_kencleng,
      nama: validated.nama,
      ranting: validated.ranting,
      alamat: validated.alamat,
      qr_code: qrCode, // e.g. "UPZ-0042"
      qr_image: qrImage, // base64 PNG
    });

    return warga.toDetailObject();
  }

  // ── USE CASE: Update Warga ──────────────────────────────────

  /**
   * Update data warga
   *
   * Jika no_kencleng berubah → regenerate QR code secara otomatis.
   *
   * @param {string} id
   * @param {object} input - Field yang diperbarui (partial)
   * @returns {Promise<object>}
   */
  async updateWarga(id, input) {
    // Validasi
    const result = updateWargaSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(
        "Data update tidak valid",
        formatZodErrors(result.error),
      );
    }

    const updateData = { ...result.data };

    // Jika no_kencleng diubah, regenerate QR code
    if (updateData.no_kencleng) {
      const { qrCode, qrImage } = await generateQrCode(updateData.no_kencleng);
      updateData.qr_code = qrCode;
      updateData.qr_image = qrImage;
    }

    const warga = await wargaRepository.update(id, updateData);
    return warga.toDetailObject();
  }

  // ── USE CASE: Delete Warga ──────────────────────────────────

  /**
   * Hapus warga permanen
   *
   * @param {string} id
   * @returns {Promise<{ message: string }>}
   */
  async deleteWarga(id) {
    // Pastikan ada sebelum dihapus
    const warga = await wargaRepository.findById(id);
    if (!warga) throw new NotFoundError("Warga");

    await wargaRepository.delete(id);
    return { message: `Warga "${warga.nama}" berhasil dihapus` };
  }

  // ── USE CASE: Import dari Excel ─────────────────────────────

  /**
   * Import massal data warga dari file Excel
   *
   * Alur lengkap:
   * 1. Parse buffer Excel → array baris
   * 2. Validasi setiap baris (Zod)
   * 3. Generate QR code untuk semua baris valid (paralel)
   * 4. Bulk insert ke database (skip duplikat)
   * 5. Simpan log import
   * 6. Return laporan hasil
   *
   * @param {Buffer|ArrayBuffer} fileBuffer - Buffer file Excel
   * @param {string} fileName - Nama file asli (untuk log)
   * @param {string} [importedBy] - ID user yang mengimport
   * @returns {Promise<ImportResult>}
   */
  async importFromExcel(fileBuffer, fileName, importedBy = null) {
    // ── 1. Parse Excel ─────────────────────────────────────
    let parseResult;
    try {
      parseResult = parseExcelBuffer(fileBuffer);
    } catch (err) {
      throw new ValidationError(
        `File Excel tidak dapat dibaca: ${err.message}`,
      );
    }

    const { validRows, errors: parseErrors, totalRows } = parseResult;

    // Jika tidak ada baris valid sama sekali, hentikan
    if (validRows.length === 0) {
      throw new ValidationError(
        `Tidak ada data valid ditemukan dalam file. Total baris: ${totalRows}`,
        parseErrors,
      );
    }

    // ── 2. Ambil max no_kencleng existing (untuk mendeteksi auto-numbering) ─
    // (Tidak wajib, tapi berguna untuk laporan)

    // ── 3. Generate QR untuk semua baris valid (paralel) ───
    // Promise.allSettled agar satu kegagalan tidak cancel semua
    const qrResults = await Promise.allSettled(
      validRows.map((row) => generateQrCode(row.no_kencleng)),
    );

    // Gabungkan data warga + QR code yang berhasil di-generate
    const dataToInsert = [];
    const qrErrors = [];

    validRows.forEach((row, idx) => {
      const qrResult = qrResults[idx];
      if (qrResult.status === "fulfilled") {
        dataToInsert.push({
          no_kencleng: row.no_kencleng,
          nama: row.nama,
          ranting: row.ranting,
          alamat: row.alamat,
          qr_code: qrResult.value.qrCode,
          qr_image: qrResult.value.qrImage,
          importBatch: null, // Akan diisi setelah log dibuat
        });
      } else {
        qrErrors.push({
          row: idx + 2, // +2: header row + 0-index
          field: "qr_code",
          message: `Gagal generate QR: ${qrResult.reason?.message}`,
          value: row.no_kencleng,
        });
      }
    });

    // ── 4. Buat import log (dapatkan batch ID) ─────────────
    const allErrors = [...parseErrors, ...qrErrors];
    const importLog = await db.importLog.create({
      data: {
        fileName,
        totalRows,
        successRows: dataToInsert.length, // Update lagi setelah insert
        failedRows: allErrors.length,
        status: "PENDING",
        errors: allErrors.length > 0 ? JSON.stringify(allErrors) : null,
        importedBy,
      },
    });

    // Tandai setiap baris dengan batch ID
    dataToInsert.forEach((d) => {
      d.importBatch = importLog.id;
    });

    // ── 5. Bulk insert ke database ─────────────────────────
    let insertResult = { created: 0, skipped: 0, skippedItems: [] };
    if (dataToInsert.length > 0) {
      insertResult = await wargaRepository.createMany(dataToInsert);
    }

    // ── 6. Update log dengan hasil akhir ───────────────────
    const finalStatus =
      insertResult.created > 0
        ? allErrors.length > 0 || insertResult.skipped > 0
          ? "PARTIAL"
          : "SUCCESS"
        : "FAILED";

    await db.importLog.update({
      where: { id: importLog.id },
      data: {
        successRows: insertResult.created,
        failedRows: allErrors.length + insertResult.skipped,
        status: finalStatus,
      },
    });

    // ── 7. Return laporan lengkap ──────────────────────────
    return {
      batchId: importLog.id,
      fileName,
      totalRows, // Total baris di file
      parsed: validRows.length, // Baris yang lolos validasi
      created: insertResult.created, // Baris yang berhasil disimpan
      skipped: insertResult.skipped, // Duplikat yang di-skip
      skippedItems: insertResult.skippedItems, // No kencleng yang di-skip
      failed: allErrors.length, // Baris yang gagal validasi/QR
      errors: allErrors.slice(0, 50), // Maksimal 50 error ditampilkan
      status: finalStatus,
    };
  }

  // ── USE CASE: Regenerate QR Code ───────────────────────────

  /**
   * Buat ulang gambar QR code untuk satu warga
   * Berguna jika gambar QR rusak atau perlu diperbarui.
   *
   * @param {string} id - ID warga
   * @returns {Promise<object>} Warga dengan qr_image baru
   */
  async regenerateQrCode(id) {
    const warga = await wargaRepository.findById(id);
    if (!warga) throw new NotFoundError("Warga");

    // Generate ulang QR menggunakan qr_code yang sudah ada
    const { qrImage } = await generateQrCode(warga.no_kencleng);

    const updated = await wargaRepository.update(id, { qr_image: qrImage });
    return updated.toDetailObject();
  }

  // ── USE CASE: Download Excel Template ──────────────────────

  /**
   * Buat dan kembalikan buffer file template Excel kosong
   *
   * @returns {Buffer}
   */
  getExcelTemplate() {
    return createExcelTemplate();
  }

  // ── USE CASE: Statistik ─────────────────────────────────────

  /**
   * Ambil statistik ringkasan untuk dashboard
   *
   * @returns {Promise<object>}
   */
  async getStats() {
    return wargaRepository.getStats();
  }

  /**
   * Ambil daftar ranting untuk dropdown filter
   *
   * @returns {Promise<string[]>}
   */
  async getRantingList() {
    return wargaRepository.findAllRanting();
  }
}

// Export singleton
export const wargaService = new WargaService();
