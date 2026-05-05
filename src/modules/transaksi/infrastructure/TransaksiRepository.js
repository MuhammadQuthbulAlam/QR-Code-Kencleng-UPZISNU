// ============================================================
// src/modules/transaksi/infrastructure/TransaksiRepository.js
// Infrastructure Layer: Prisma Repository untuk Transaksi
// ============================================================

import { db } from "@/infrastructure/database/db";
import { Transaksi } from "../domain/Transaksi";
import { NotFoundError } from "@/core/errors/AppError";

export class TransaksiRepository {
  // Select default — semua field kecuali relasi berat
  #select = {
    id: true,
    wargaId: true,
    qrCode: true,
    noKencleng: true,
    namaWarga: true,
    ranting: true,
    nominal: true,
    catatan: true,
    metodePembayaran: true,
    status: true,
    petugasId: true,
    petugasNama: true,
    bulan: true,
    tahun: true,
    createdAt: true,
    updatedAt: true,
  };

  // ── READ ─────────────────────────────────────────────────────

  /**
   * List transaksi dengan filter, search, dan pagination
   */
  async findAll({
    page = 1,
    limit = 20,
    wargaId,
    ranting,
    bulan,
    tahun,
    status,
    search,
    dateFrom,
    dateTo,
  } = {}) {
    const offset = (page - 1) * limit;

    // Bangun kondisi WHERE secara dinamis
    const where = {
      ...(wargaId && { wargaId }),
      ...(ranting && { ranting: { contains: ranting, mode: "insensitive" } }),
      ...(bulan && { bulan }),
      ...(tahun && { tahun }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { namaWarga: { contains: search, mode: "insensitive" } },
          { noKencleng: { contains: search, mode: "insensitive" } },
          { qrCode: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      db.transaksi.findMany({
        where,
        select: this.#select,
        orderBy: { createdAt: "desc" }, // Terbaru dulu
        skip: offset,
        take: limit,
      }),
      db.transaksi.count({ where }),
    ]);

    return {
      data: rows.map(Transaksi.fromPrisma),
      total,
    };
  }

  /** Satu transaksi berdasarkan ID */
  async findById(id) {
    const row = await db.transaksi.findUnique({
      where: { id },
      select: this.#select,
    });
    return row ? Transaksi.fromPrisma(row) : null;
  }

  /** Semua transaksi milik satu warga */
  async findByWargaId(wargaId, limit = 10) {
    const rows = await db.transaksi.findMany({
      where: { wargaId },
      select: this.#select,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(Transaksi.fromPrisma);
  }

  // ── WRITE ────────────────────────────────────────────────────

  /** Buat satu transaksi baru */
  async create(data) {
    const row = await db.transaksi.create({
      data: { ...data, status: "SUKSES" }, // Langsung SUKSES untuk MVP
      select: this.#select,
    });
    return Transaksi.fromPrisma(row);
  }

  /** Update status transaksi (konfirmasi / batalkan) */
  async updateStatus(id, status) {
    const existing = await db.transaksi.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Transaksi");

    const row = await db.transaksi.update({
      where: { id },
      data: { status },
      select: this.#select,
    });
    return Transaksi.fromPrisma(row);
  }

  // ── AGGREGATES ───────────────────────────────────────────────

  /**
   * Total nominal terkumpul (untuk dashboard)
   * Filter opsional: bulan, tahun, ranting, status
   */
  async sumNominal({ bulan, tahun, ranting, status = "SUKSES" } = {}) {
    const result = await db.transaksi.aggregate({
      where: {
        status,
        ...(bulan && { bulan }),
        ...(tahun && { tahun }),
        ...(ranting && { ranting: { contains: ranting, mode: "insensitive" } }),
      },
      _sum: { nominal: true },
      _count: { id: true },
    });

    return {
      totalNominal: result._sum.nominal ?? 0,
      totalCount: result._count.id ?? 0,
    };
  }

  /**
   * Ringkasan per ranting (untuk laporan)
   */
  async summaryByRanting({ bulan, tahun } = {}) {
    return db.transaksi.groupBy({
      by: ["ranting"],
      where: {
        status: "SUKSES",
        ...(bulan && { bulan }),
        ...(tahun && { tahun }),
      },
      _sum: { nominal: true },
      _count: { id: true },
      orderBy: { _sum: { nominal: "desc" } },
    });
  }

  /**
   * Transaksi harian untuk chart (7 atau 30 hari terakhir)
   */
  async dailySummary(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return db.transaksi.groupBy({
      by: ["createdAt"],
      where: { status: "SUKSES", createdAt: { gte: since } },
      _sum: { nominal: true },
      _count: { id: true },
    });
  }
}

export const transaksiRepository = new TransaksiRepository();
