// ============================================================
// src/modules/transaksi/application/TransaksiService.js
// Application Layer: Use Cases Transaksi
// ============================================================

import { transaksiRepository } from "../infrastructure/TransaksiRepository";
import {
  createTransaksiSchema,
  listTransaksiSchema,
  formatZodErrors,
} from "../domain/transaksiSchema";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/core/errors/AppError";
import { db } from "@/infrastructure/database/db";
import { getPaginationMeta } from "@/core/utils";

export class TransaksiService {
  // ── USE CASE: Buat Transaksi Baru ────────────────────────────

  /**
   * Input transaksi setoran kencleng.
   *
   * Alur:
   * 1. Validasi input (Zod)
   * 2. Ambil & verifikasi data warga dari DB (berdasarkan wargaId)
   * 3. Cek warga masih aktif
   * 4. Set periode (bulan/tahun) → default ke bulan & tahun saat ini
   * 5. Snapshot data warga ke transaksi (nama, ranting, qrCode)
   * 6. Simpan ke database
   * 7. Return transaksi yang tersimpan
   *
   * @param {object} input — data dari request body
   * @returns {Promise<object>} Transaksi yang baru dibuat
   */
  async createTransaksi(input) {
    // ── 1. Validasi ─────────────────────────────────────────
    const result = createTransaksiSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(
        "Data transaksi tidak valid",
        formatZodErrors(result.error),
      );
    }
    const data = result.data;

    // ── 2. Ambil data warga ──────────────────────────────────
    const warga = await db.warga.findUnique({
      where: { id: data.wargaId },
      select: {
        id: true,
        nama: true,
        ranting: true,
        qr_code: true,
        no_kencleng: true,
        isActive: true,
      },
    });

    if (!warga) {
      throw new NotFoundError(
        "Warga",
        "Data warga tidak ditemukan. Pastikan QR code valid.",
      );
    }

    // ── 3. Cek warga aktif ───────────────────────────────────
    if (!warga.isActive) {
      throw new ValidationError(
        `Warga "${warga.nama}" sudah tidak aktif dan tidak bisa menerima setoran.`,
      );
    }

    // ── 4. Set periode — default bulan & tahun sekarang ─────
    const now = new Date();
    const bulan = data.bulan ?? now.getMonth() + 1; // getMonth() 0-indexed
    const tahun = data.tahun ?? now.getFullYear();

    // ── 5. Buat transaksi dengan snapshot data warga ─────────
    // "Snapshot" = salin nilai warga ke kolom transaksi
    // Ini melindungi history jika data warga berubah kemudian hari
    const transaksi = await transaksiRepository.create({
      wargaId: warga.id,
      qrCode: warga.qr_code, // Snapshot QR code
      noKencleng: warga.no_kencleng, // Snapshot no kencleng
      namaWarga: warga.nama, // Snapshot nama
      ranting: warga.ranting, // Snapshot ranting
      nominal: data.nominal,
      catatan: data.catatan ?? null,
      metodePembayaran: data.metodePembayaran,
      petugasId: data.petugasId ?? null,
      petugasNama: data.petugasNama ?? null,
      bulan,
      tahun,
    });

    return transaksi.toJSON();
  }

  // ── USE CASE: List Transaksi ──────────────────────────────────

  async listTransaksi(query = {}) {
    // Validasi query params
    const parsed = listTransaksiSchema.safeParse(query);
    if (!parsed.success) {
      throw new ValidationError(
        "Parameter query tidak valid",
        formatZodErrors(parsed.error),
      );
    }
    const { page, limit, ...filters } = parsed.data;

    const { data, total } = await transaksiRepository.findAll({
      page,
      limit,
      ...filters,
    });
    const meta = getPaginationMeta(total, page, limit);

    return {
      data: data.map((t) => t.toJSON()),
      ...meta,
    };
  }

  // ── USE CASE: Detail Transaksi ────────────────────────────────

  async getTransaksiById(id) {
    const t = await transaksiRepository.findById(id);
    if (!t) throw new NotFoundError("Transaksi");
    return t.toJSON();
  }

  // ── USE CASE: Riwayat Transaksi Warga ─────────────────────────

  async getRiwayatWarga(wargaId) {
    // Verifikasi warga ada
    const warga = await db.warga.findUnique({
      where: { id: wargaId },
      select: { id: true, nama: true, no_kencleng: true, ranting: true },
    });
    if (!warga) throw new NotFoundError("Warga");

    const transaksi = await transaksiRepository.findByWargaId(wargaId, 50);

    return {
      warga,
      transaksi: transaksi.map((t) => t.toJSON()),
      total: transaksi.length,
    };
  }

  // ── USE CASE: Batalkan Transaksi ──────────────────────────────

  async batalkanTransaksi(id, alasan = "") {
    const t = await transaksiRepository.findById(id);
    if (!t) throw new NotFoundError("Transaksi");

    if (!t.isCancellable()) {
      throw new ValidationError(
        `Transaksi tidak bisa dibatalkan. Status saat ini: ${t.status}`,
      );
    }

    const updated = await transaksiRepository.updateStatus(id, "DIBATALKAN");
    return updated.toJSON();
  }

  // ── USE CASE: Dashboard Stats ─────────────────────────────────

  async getStats({ bulan, tahun } = {}) {
    const now = new Date();
    const b = bulan ?? now.getMonth() + 1;
    const y = tahun ?? now.getFullYear();

    const [bulanIni, total, byRanting] = await Promise.all([
      transaksiRepository.sumNominal({ bulan: b, tahun: y }),
      transaksiRepository.sumNominal(), // All time
      transaksiRepository.summaryByRanting({ bulan: b, tahun: y }),
    ]);

    return {
      periode: { bulan: b, tahun: y },
      bulanIni: bulanIni,
      allTime: total,
      byRanting: byRanting.map((r) => ({
        ranting: r.ranting,
        totalNominal: r._sum.nominal ?? 0,
        totalCount: r._count.id ?? 0,
      })),
    };
  }
}

export const transaksiService = new TransaksiService();
