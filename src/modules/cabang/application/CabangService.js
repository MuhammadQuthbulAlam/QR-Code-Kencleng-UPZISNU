// ============================================================
// src/modules/cabang/application/CabangService.js
// Application Layer: Use Cases untuk Cabang
// ============================================================

import { cabangRepository } from "../infrastructure/CabangRepository";
import {
  createCabangSchema,
  updateCabangSchema,
  listCabangSchema,
  formatZodErrors,
} from "../domain/cabangSchema";
import { ValidationError, NotFoundError } from "@/core/errors/AppError";
import { getPaginationMeta } from "@/core/utils";

export class CabangService {
  // ── List cabang (dengan pagination & filter) ─────────────────
  async listCabang(query = {}) {
    const parsed = listCabangSchema.safeParse(query);
    if (!parsed.success)
      throw new ValidationError(
        "Query tidak valid",
        formatZodErrors(parsed.error),
      );

    const { page, limit, tree, ...filters } = parsed.data;

    // Jika diminta sebagai tree, return struktur hierarki
    if (tree === "true") {
      const roots = await cabangRepository.findAsTree();
      return { data: roots.map((c) => c.toJSON()), isTree: true };
    }

    const { data, total } = await cabangRepository.findAll({
      page,
      limit,
      ...filters,
    });
    const meta = getPaginationMeta(total, page, limit);

    return { data: data.map((c) => c.toJSON()), ...meta };
  }

  // ── Dropdown untuk form (semua cabang aktif, flat) ────────────
  async getDropdownList() {
    const list = await cabangRepository.findAllActive();
    // Group by daerah untuk UI dropdown yang rapi
    const grouped = {};
    list.forEach((c) => {
      const key = c.daerah;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: c.id,
        kode: c.kode,
        nama: c.getNamaLengkap(),
        tingkat: c.tingkat,
      });
    });
    return { grouped, flat: list.map((c) => c.toJSON()) };
  }

  // ── Daftar daerah unik ────────────────────────────────────────
  async getDaerahList() {
    return cabangRepository.findAllDaerah();
  }

  // ── Detail satu cabang ────────────────────────────────────────
  async getCabangById(id) {
    const cabang = await cabangRepository.findById(id);
    if (!cabang) throw new NotFoundError("Cabang");
    return cabang.toJSON();
  }

  // ── Buat cabang baru ──────────────────────────────────────────
  async createCabang(input) {
    const result = createCabangSchema.safeParse(input);
    if (!result.success)
      throw new ValidationError(
        "Data cabang tidak valid",
        formatZodErrors(result.error),
      );

    const cabang = await cabangRepository.create(result.data);
    return cabang.toJSON();
  }

  // ── Update cabang ─────────────────────────────────────────────
  async updateCabang(id, input) {
    const result = updateCabangSchema.safeParse(input);
    if (!result.success)
      throw new ValidationError(
        "Data update tidak valid",
        formatZodErrors(result.error),
      );

    const cabang = await cabangRepository.update(id, result.data);
    return cabang.toJSON();
  }

  // ── Hapus cabang ──────────────────────────────────────────────
  async deleteCabang(id) {
    await cabangRepository.delete(id);
    return { message: "Cabang berhasil dihapus" };
  }

  // ── Toggle aktif/nonaktif ─────────────────────────────────────
  async toggleActive(id) {
    const cabang = await cabangRepository.toggleActive(id);
    const status = cabang.isActive ? "diaktifkan" : "dinonaktifkan";
    return { message: `Cabang berhasil ${status}`, data: cabang.toJSON() };
  }

  // ── Assign user ke cabang ─────────────────────────────────────
  async assignUser(userId, cabangId, role = "PETUGAS", isDefault = false) {
    // Validasi cabang ada
    const cabang = await cabangRepository.findById(cabangId);
    if (!cabang) throw new NotFoundError("Cabang");

    await cabangRepository.assignUser(userId, cabangId, role, isDefault);
    return { message: `User berhasil ditetapkan ke cabang ${cabang.nama}` };
  }

  // ── Cabang yang bisa diakses user ─────────────────────────────
  async getCabangForUser(userId) {
    return cabangRepository.findCabangForUser(userId);
  }
}

export const cabangService = new CabangService();
