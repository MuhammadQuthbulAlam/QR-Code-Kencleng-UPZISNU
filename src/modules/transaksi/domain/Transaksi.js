// ============================================================
// src/modules/transaksi/domain/Transaksi.js
// Domain Entity: Transaksi
//
// Merepresentasikan satu catatan setoran kencleng.
// Menggunakan pola "snapshot" — nama warga, ranting, dll
// disimpan langsung di tabel transaksi agar history tetap
// akurat meskipun data warga berubah di kemudian hari.
// ============================================================

/** Batas minimum nominal yang diterima (Rp 500) */
export const NOMINAL_MIN = 500;

/** Batas maksimum nominal dalam satu transaksi (Rp 50.000.000) */
export const NOMINAL_MAX = 50_000_000;

export class Transaksi {
  constructor(data) {
    this.id = data.id;
    this.wargaId = data.wargaId;
    this.qrCode = data.qrCode;
    this.noKencleng = data.noKencleng;
    this.namaWarga = data.namaWarga;
    this.ranting = data.ranting;
    this.nominal = data.nominal; // Integer, dalam Rupiah
    this.catatan = data.catatan ?? null;
    this.metodePembayaran = data.metodePembayaran ?? "TUNAI";
    this.status = data.status ?? "PENDING";
    this.petugasId = data.petugasId ?? null;
    this.petugasNama = data.petugasNama ?? null;
    this.bulan = data.bulan;
    this.tahun = data.tahun;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // ── Business Rules ───────────────────────────────────────────

  /** Apakah nominal dalam batas yang diperbolehkan */
  isNominalValid() {
    return (
      Number.isInteger(this.nominal) &&
      this.nominal >= NOMINAL_MIN &&
      this.nominal <= NOMINAL_MAX
    );
  }

  /** Apakah transaksi masih bisa dibatalkan (hanya status PENDING) */
  isCancellable() {
    return this.status === "PENDING";
  }

  /** Apakah transaksi sudah final (tidak bisa diubah) */
  isFinal() {
    return this.status === "SUKSES" || this.status === "DIBATALKAN";
  }

  /**
   * Format nominal ke string Rupiah
   * Contoh: 50000 → "Rp 50.000"
   */
  getNominalFormatted() {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(this.nominal);
  }

  /** Label periode setoran, e.g. "Januari 2025" */
  getPeriodeLabel() {
    const bulanNama = [
      "",
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${bulanNama[this.bulan]} ${this.tahun}`;
  }

  /** Plain object untuk respons API (tanpa field internal) */
  toJSON() {
    return {
      id: this.id,
      wargaId: this.wargaId,
      qrCode: this.qrCode,
      noKencleng: this.noKencleng,
      namaWarga: this.namaWarga,
      ranting: this.ranting,
      nominal: this.nominal,
      nominalFormatted: this.getNominalFormatted(),
      catatan: this.catatan,
      metodePembayaran: this.metodePembayaran,
      status: this.status,
      petugasNama: this.petugasNama,
      periode: this.getPeriodeLabel(),
      bulan: this.bulan,
      tahun: this.tahun,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /** Factory dari row Prisma */
  static fromPrisma(row) {
    return new Transaksi(row);
  }
}
