// ============================================================
// src/modules/cabang/infrastructure/CabangRepository.js
// Infrastructure Layer: Prisma Repository untuk Cabang
// ============================================================

import { db } from "@/infrastructure/database/db";
import { Cabang } from "../domain/Cabang";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";

export class CabangRepository {
  // Select default — termasuk count warga & transaksi
  #select = {
    id: true,
    kode: true,
    nama: true,
    daerah: true,
    tingkat: true,
    alamat: true,
    telepon: true,
    email: true,
    ketua: true,
    isActive: true,
    parentId: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        warga: true, // Jumlah warga di cabang ini
        transaksi: true, // Jumlah transaksi
        children: true, // Jumlah sub-cabang
      },
    },
  };

  // ── READ ─────────────────────────────────────────────────────

  /**
   * Ambil semua cabang dengan pagination & filter
   */
  async findAll({
    page = 1,
    limit = 50,
    daerah,
    tingkat,
    search,
    active,
  } = {}) {
    const offset = (page - 1) * limit;

    const where = {
      ...(daerah && { daerah: { contains: daerah, mode: "insensitive" } }),
      ...(tingkat && { tingkat }),
      ...(active !== undefined && {
        isActive: active === true || active === "true",
      }),
      ...(search && {
        OR: [
          { nama: { contains: search, mode: "insensitive" } },
          { kode: { contains: search, mode: "insensitive" } },
          { daerah: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      db.cabang.findMany({
        where,
        select: this.#select,
        orderBy: [{ tingkat: "asc" }, { daerah: "asc" }, { nama: "asc" }],
        skip: offset,
        take: limit,
      }),
      db.cabang.count({ where }),
    ]);

    return { data: rows.map(Cabang.fromPrisma), total };
  }

  /**
   * Ambil semua cabang aktif sebagai flat list (untuk dropdown)
   * Diurutkan: daerah → tingkat → nama
   */
  async findAllActive() {
    const rows = await db.cabang.findMany({
      where: { isActive: true },
      select: {
        id: true,
        kode: true,
        nama: true,
        daerah: true,
        tingkat: true,
        parentId: true,
      },
      orderBy: [{ daerah: "asc" }, { tingkat: "asc" }, { nama: "asc" }],
    });
    return rows.map(Cabang.fromPrisma);
  }

  /**
   * Ambil cabang sebagai tree terstruktur (parent → children)
   * Hanya root (tidak punya parent) yang jadi entry point
   */
  async findAsTree() {
    // Ambil semua sekaligus, lalu susun di memori (lebih efisien dari recursive query)
    const all = await db.cabang.findMany({
      where: { isActive: true },
      select: { ...this.#select, children: { select: this.#select } },
      orderBy: [{ tingkat: "asc" }, { nama: "asc" }],
    });

    // Filter hanya root
    const roots = all.filter((c) => !c.parentId);
    return roots.map(Cabang.fromPrisma);
  }

  /** Satu cabang berdasarkan ID (lengkap dengan parent & children) */
  async findById(id) {
    const row = await db.cabang.findUnique({
      where: { id },
      select: {
        ...this.#select,
        parent: { select: { id: true, nama: true, kode: true, tingkat: true } },
        children: { select: this.#select },
      },
    });
    return row ? Cabang.fromPrisma(row) : null;
  }

  /** Lookup berdasarkan kode */
  async findByKode(kode) {
    const row = await db.cabang.findUnique({
      where: { kode },
      select: this.#select,
    });
    return row ? Cabang.fromPrisma(row) : null;
  }

  /** Daftar daerah unik (untuk dropdown filter) */
  async findAllDaerah() {
    const rows = await db.cabang.findMany({
      where: { isActive: true },
      select: { daerah: true },
      distinct: ["daerah"],
      orderBy: { daerah: "asc" },
    });
    return rows.map((r) => r.daerah);
  }

  // ── WRITE ────────────────────────────────────────────────────

  async create(data) {
    // Cek duplikasi kode
    const dup = await db.cabang.findUnique({
      where: { kode: data.kode },
      select: { id: true },
    });
    if (dup)
      throw new ConflictError(`Kode cabang "${data.kode}" sudah terdaftar`);

    // Validasi parentId jika ada
    if (data.parentId) {
      const parent = await db.cabang.findUnique({
        where: { id: data.parentId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundError("Cabang induk");
    }

    const row = await db.cabang.create({ data, select: this.#select });
    return Cabang.fromPrisma(row);
  }

  async update(id, data) {
    const existing = await db.cabang.findUnique({
      where: { id },
      select: { id: true, kode: true },
    });
    if (!existing) throw new NotFoundError("Cabang");

    // Cek duplikasi kode jika kode diubah
    if (data.kode && data.kode !== existing.kode) {
      const dup = await db.cabang.findFirst({
        where: { kode: data.kode, NOT: { id } },
        select: { id: true },
      });
      if (dup)
        throw new ConflictError(`Kode cabang "${data.kode}" sudah digunakan`);
    }

    const row = await db.cabang.update({
      where: { id },
      data,
      select: this.#select,
    });
    return Cabang.fromPrisma(row);
  }

  async delete(id) {
    const existing = await db.cabang.findUnique({
      where: { id },
      select: { id: true, _count: { select: { warga: true, children: true } } },
    });
    if (!existing) throw new NotFoundError("Cabang");

    if (existing._count.warga > 0) {
      throw new Error(
        `Cabang masih memiliki ${existing._count.warga} warga terdaftar. Pindahkan warga terlebih dahulu.`,
      );
    }
    if (existing._count.children > 0) {
      throw new Error(
        "Cabang masih memiliki sub-cabang. Hapus sub-cabang terlebih dahulu.",
      );
    }

    await db.cabang.delete({ where: { id } });
  }

  async toggleActive(id) {
    const existing = await db.cabang.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!existing) throw new NotFoundError("Cabang");

    const row = await db.cabang.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: this.#select,
    });
    return Cabang.fromPrisma(row);
  }

  // ── UserCabang ───────────────────────────────────────────────

  /** Assign user ke cabang */
  async assignUser(userId, cabangId, role = "PETUGAS", isDefault = false) {
    // Jika isDefault, reset cabang default user lainnya
    if (isDefault) {
      await db.userCabang.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return db.userCabang.upsert({
      where: { userId_cabangId: { userId, cabangId } },
      update: { role, isDefault },
      create: { userId, cabangId, role, isDefault },
    });
  }

  /** Cabang yang dapat diakses oleh user */
  async findCabangForUser(userId) {
    const rows = await db.userCabang.findMany({
      where: { userId },
      include: {
        cabang: {
          select: {
            id: true,
            kode: true,
            nama: true,
            daerah: true,
            tingkat: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return rows.map((r) => ({
      ...r.cabang,
      isDefault: r.isDefault,
      roleAtCabang: r.role,
    }));
  }
}

export const cabangRepository = new CabangRepository();
