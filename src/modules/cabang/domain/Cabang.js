// ============================================================
// src/modules/cabang/domain/Cabang.js
// Domain Entity: Cabang
//
// Merepresentasikan satu unit organisasi NU:
// PWNU (wilayah) → PCNU (cabang) → MWC (kecamatan)
// ============================================================

export class Cabang {
  constructor(data) {
    this.id = data.id;
    this.kode = data.kode;
    this.nama = data.nama;
    this.daerah = data.daerah;
    this.tingkat = data.tingkat ?? "CABANG";
    this.alamat = data.alamat ?? null;
    this.telepon = data.telepon ?? null;
    this.email = data.email ?? null;
    this.ketua = data.ketua ?? null;
    this.isActive = data.isActive ?? true;
    this.parentId = data.parentId ?? null;

    // Relasi yang mungkin ikut di-load
    this.parent = data.parent ?? null; // Cabang induk (opsional)
    this.children = data.children ?? []; // Cabang bawahan
    this._count = data._count ?? null; // Counter warga/transaksi dari Prisma

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // ── Business Rules ───────────────────────────────────────────

  /** Label tingkatan yang readable */
  getTingkatLabel() {
    return (
      { WILAYAH: "PWNU", CABANG: "PCNU", MWC: "MWC" }[this.tingkat] ??
      this.tingkat
    );
  }

  /** Nama lengkap dengan tingkatan, e.g. "PCNU Kota Surabaya" */
  getNamaLengkap() {
    return `${this.getTingkatLabel()} ${this.nama}`;
  }

  /** Apakah ini cabang tingkat tertinggi (tidak punya parent) */
  isRoot() {
    return !this.parentId;
  }

  /** Jumlah warga terdaftar (jika _count dimuat) */
  getJumlahWarga() {
    return this._count?.warga ?? 0;
  }

  /** Plain object untuk API response */
  toJSON() {
    return {
      id: this.id,
      kode: this.kode,
      nama: this.nama,
      namaLengkap: this.getNamaLengkap(),
      daerah: this.daerah,
      tingkat: this.tingkat,
      tingkatLabel: this.getTingkatLabel(),
      alamat: this.alamat,
      telepon: this.telepon,
      email: this.email,
      ketua: this.ketua,
      isActive: this.isActive,
      parentId: this.parentId,
      jumlahWarga: this.getJumlahWarga(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /** Factory dari Prisma row */
  static fromPrisma(row) {
    return new Cabang(row);
  }
}
