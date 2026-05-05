// ============================================================
// src/modules/kencleng/application/excelParser.js
// Excel Parser — Application Layer
//
// Mengurai file Excel (.xlsx / .xls) menjadi array data warga.
// Menggunakan library SheetJS (xlsx) yang sudah ada di project.
//
// Mendukung dua format kolom:
//   Format A (header bahasa Indonesia): no_kencleng, nama, ranting, alamat
//   Format B (urutan kolom): kolom A=no_kencleng, B=nama, C=ranting, D=alamat
// ============================================================

import * as XLSX from "xlsx"; // SheetJS — parse Excel tanpa server binary
import { excelRowSchema, formatZodErrors } from "../domain/wargaSchema";

// ── Mapping nama kolom yang diterima ─────────────────────────
// Header di file Excel bisa dalam berbagai format penulisan.
// Kita normalisasi semuanya ke key standar yang dipakai di domain.
const COLUMN_ALIASES = {
  no_kencleng: [
    "no_kencleng",
    "no kencleng",
    "nomor kencleng",
    "no.",
    "nomor",
    "no_kenclengg",
    "kencleng",
    "no kencleng warga",
  ],
  nama: ["nama", "nama lengkap", "nama warga", "name"],
  ranting: ["ranting", "ranting/cabang", "cabang", "nama ranting"],
  alamat: ["alamat", "address", "alamat lengkap", "alamat tinggal"],
};

// ── Fungsi Utama ─────────────────────────────────────────────

/**
 * parseExcelBuffer — Parse buffer file Excel menjadi array data warga
 *
 * Alur kerja:
 * 1. Baca buffer Excel dengan SheetJS
 * 2. Ambil sheet pertama
 * 3. Konversi ke array of objects
 * 4. Deteksi format kolom (header / urutan)
 * 5. Validasi setiap baris dengan Zod
 * 6. Return: { validRows, errors, totalRows }
 *
 * @param {Buffer|ArrayBuffer} buffer - Isi file Excel
 * @returns {{ validRows: object[], errors: object[], totalRows: number }}
 *
 * @example
 * const buffer = await file.arrayBuffer();
 * const { validRows, errors } = await parseExcelBuffer(buffer);
 * // validRows → [{ no_kencleng: "0001", nama: "Ahmad", ranting: "Kauman", alamat: "Jl. ..." }]
 * // errors → [{ row: 3, field: "nama", message: "Nama wajib diisi" }]
 */
export function parseExcelBuffer(buffer) {
  // ── 1. Baca file Excel ────────────────────────────────────
  const workbook = XLSX.read(buffer, {
    type: "buffer", // Input adalah Buffer Node.js
    cellText: true, // Baca nilai sebagai teks (bukan formula result)
    cellDates: true, // Parse tanggal ke Date object (bukan angka serial)
  });

  // Ambil nama sheet pertama
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("File Excel tidak memiliki sheet");
  }

  const worksheet = workbook.Sheets[sheetName];

  // ── 2. Konversi sheet ke array of objects ─────────────────
  // header: 1 → baris pertama jadi header key
  // defval: "" → nilai kosong jadi string kosong (bukan undefined)
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // Baris pertama = header
    defval: "", // Nilai default untuk cell kosong
    raw: false, // Konversi semua ke string (bukan tipe asli)
    blankrows: false, // Skip baris yang semua kolomnya kosong
  });

  if (rawRows.length === 0) {
    throw new Error("File Excel kosong atau tidak memiliki data");
  }

  // ── 3. Identifikasi header ────────────────────────────────
  const headerRow = rawRows[0]; // Baris pertama = header
  const dataRows = rawRows.slice(1); // Sisa = data

  if (dataRows.length === 0) {
    throw new Error("File Excel hanya memiliki header, tidak ada data");
  }

  // ── 4. Deteksi mapping kolom ──────────────────────────────
  // Cari index kolom untuk setiap field berdasarkan nama header
  const columnMap = detectColumnMapping(headerRow);

  // ── 5. Validasi setiap baris ──────────────────────────────
  const validRows = [];
  const errors = [];

  dataRows.forEach((rawRow, index) => {
    const rowNumber = index + 2; // +2 karena: index 0-based + baris header = baris Excel ke-2

    // Skip baris yang benar-benar kosong
    const allEmpty = rawRow.every((cell) => String(cell ?? "").trim() === "");
    if (allEmpty) return;

    // Petakan kolom Excel ke field domain
    const mapped = mapRowToFields(rawRow, columnMap);

    // Validasi dengan Zod schema
    const result = excelRowSchema.safeParse(mapped);

    if (result.success) {
      // Data valid → masukkan ke validRows
      validRows.push({
        no_kencleng: String(result.data.no_kencleng).trim(),
        nama: result.data.nama.trim(),
        ranting: result.data.ranting.trim(),
        alamat: result.data.alamat.trim(),
      });
    } else {
      // Data tidak valid → catat error dengan nomor baris
      const fieldErrors = formatZodErrors(result.error);
      fieldErrors.forEach((fe) => {
        errors.push({
          row: rowNumber, // Nomor baris di Excel
          field: fe.field,
          message: fe.message,
          // Sertakan nilai asli untuk memudahkan debugging
          value: mapped[fe.field] ?? "(kosong)",
        });
      });
    }
  });

  return {
    validRows,
    errors,
    totalRows: dataRows.filter(
      (r) => !r.every((c) => String(c ?? "").trim() === ""),
    ).length,
    sheetName, // Info tambahan: nama sheet yang dibaca
  };
}

// ── Helper Functions ─────────────────────────────────────────

/**
 * detectColumnMapping — Mendeteksi posisi (index) kolom di Excel
 *
 * Membandingkan header Excel dengan COLUMN_ALIASES untuk menemukan
 * kolom mana yang berisi field apa.
 *
 * @param {string[]} headerRow - Baris pertama Excel
 * @returns {{ no_kencleng: number, nama: number, ranting: number, alamat: number }}
 */
function detectColumnMapping(headerRow) {
  const map = {
    no_kencleng: -1,
    nama: -1,
    ranting: -1,
    alamat: -1,
  };

  headerRow.forEach((cell, colIndex) => {
    // Normalisasi: lowercase + hapus spasi berlebih
    const normalizedCell = String(cell ?? "")
      .toLowerCase()
      .trim();

    // Cek setiap field, cocokkan dengan alias-nya
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalizedCell) && map[field] === -1) {
        map[field] = colIndex; // Catat index kolom yang cocok
      }
    }
  });

  // Fallback: jika header tidak terdeteksi, gunakan urutan kolom default
  // (asumsi: A=no_kencleng, B=nama, C=ranting, D=alamat)
  if (map.no_kencleng === -1 && map.nama === -1) {
    console.warn(
      "⚠️ Header Excel tidak terdeteksi, menggunakan urutan kolom default (A,B,C,D)",
    );
    map.no_kencleng = 0;
    map.nama = 1;
    map.ranting = 2;
    map.alamat = 3;
  }

  return map;
}

/**
 * mapRowToFields — Petakan baris Excel ke object field domain
 *
 * @param {any[]} row - Baris data dari sheet_to_json
 * @param {object} columnMap - Hasil detectColumnMapping
 * @returns {object} Object dengan key domain field
 */
function mapRowToFields(row, columnMap) {
  return {
    no_kencleng: columnMap.no_kencleng >= 0 ? row[columnMap.no_kencleng] : "",
    nama: columnMap.nama >= 0 ? row[columnMap.nama] : "",
    ranting: columnMap.ranting >= 0 ? row[columnMap.ranting] : "",
    alamat: columnMap.alamat >= 0 ? row[columnMap.alamat] : "",
  };
}

/**
 * createExcelTemplate — Membuat file Excel template kosong untuk diunduh
 *
 * User bisa download template ini, isi datanya,
 * lalu upload kembali untuk import.
 *
 * @returns {Buffer} Buffer file Excel
 */
export function createExcelTemplate() {
  const workbook = XLSX.utils.book_new();

  // Baris header sesuai format yang diterima
  const headerRow = ["no_kencleng", "nama", "ranting", "alamat"];

  // Baris contoh data
  const exampleRows = [
    ["0001", "Ahmad Fauzi", "Ranting Kauman", "Jl. Masjid No. 1, Kab. Kauman"],
    [
      "0002",
      "Siti Aminah",
      "Ranting Mergosari",
      "Jl. Pesantren No. 5, Kec. Mergosari",
    ],
  ];

  const worksheetData = [headerRow, ...exampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData); // aoa = array of arrays

  // Atur lebar kolom agar template lebih rapi
  worksheet["!cols"] = [
    { width: 15 }, // no_kencleng
    { width: 30 }, // nama
    { width: 25 }, // ranting
    { width: 50 }, // alamat
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");

  // Konversi ke Buffer yang bisa dikirim sebagai HTTP response
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
