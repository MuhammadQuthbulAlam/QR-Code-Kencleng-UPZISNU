// ============================================================
// src/app/api/kencleng/import/route.js
// API Route: POST /api/kencleng/import — upload & import Excel
//            GET  /api/kencleng/import — download template Excel
// ============================================================

import { NextResponse } from "next/server";
import { wargaService } from "@/modules/kencleng/application/WargaService";
import { formatErrorResponse, ValidationError } from "@/core/errors/AppError";

// ── POST /api/kencleng/import ────────────────────────────────
/**
 * Upload file Excel dan import data warga secara massal.
 *
 * Request: multipart/form-data
 *   file: <file .xlsx atau .xls>
 *
 * Format kolom Excel yang diterima (baris pertama = header):
 *   no_kencleng | nama | ranting | alamat
 *
 * Response 200:
 * {
 *   success: true,
 *   message: "Import selesai: 45 berhasil, 3 di-skip, 2 gagal",
 *   result: {
 *     batchId:      "cm...",      ← ID log import (untuk audit)
 *     fileName:     "warga.xlsx",
 *     totalRows:    50,           ← Total baris di file
 *     parsed:       48,           ← Lolos validasi format
 *     created:      45,           ← Berhasil disimpan ke DB
 *     skipped:      3,            ← Di-skip karena nomor duplikat
 *     skippedItems: ["0001",...], ← Nomor yang di-skip
 *     failed:       2,            ← Gagal validasi / error QR
 *     errors: [ { row, field, message, value } ],
 *     status: "PARTIAL"           ← SUCCESS | PARTIAL | FAILED
 *   }
 * }
 */
export async function POST(request) {
  try {
    // ── Parse multipart form data ─────────────────────────
    const formData = await request.formData();
    const file = formData.get("file"); // Field name harus "file"

    // Validasi keberadaan file
    if (!file) {
      throw new ValidationError("File Excel wajib diupload", [
        {
          field: "file",
          message: "Tidak ada file yang diterima. Gunakan field 'file'.",
        },
      ]);
    }

    // Validasi tipe file (hanya Excel)
    const fileName = file.name ?? "unknown.xlsx";
    const isExcel = /\.(xlsx|xls)$/i.test(fileName);
    const mimeIsExcel = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(file.type);

    if (!isExcel && !mimeIsExcel) {
      throw new ValidationError("Format file tidak didukung", [
        {
          field: "file",
          message: `File harus berformat .xlsx atau .xls. Diterima: ${file.type || "unknown"}`,
        },
      ]);
    }

    // Validasi ukuran file (maksimal 10 MB)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new ValidationError("Ukuran file terlalu besar", [
        {
          field: "file",
          message: `Ukuran file maksimal 10 MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        },
      ]);
    }

    // ── Baca buffer file ──────────────────────────────────
    // file.arrayBuffer() → ArrayBuffer, Buffer.from() → Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ambil user dari header (jika sudah ada auth middleware)
    // const userId = request.headers.get("x-user-id") || null;

    // ── Panggil service ───────────────────────────────────
    const result = await wargaService.importFromExcel(
      buffer,
      fileName,
      null, // userId — isi setelah auth middleware aktif
    );

    // ── Susun pesan summary ───────────────────────────────
    const parts = [];
    if (result.created > 0) parts.push(`${result.created} berhasil diimport`);
    if (result.skipped > 0) parts.push(`${result.skipped} di-skip (duplikat)`);
    if (result.failed > 0) parts.push(`${result.failed} gagal`);
    const summaryMsg = parts.join(", ") || "Tidak ada data yang diproses";

    // HTTP 207 Multi-Status jika ada sebagian sukses sebagian gagal
    // HTTP 200 jika semua sukses
    const statusCode =
      result.status === "FAILED"
        ? 422
        : result.status === "PARTIAL"
          ? 207
          : 200;

    return NextResponse.json(
      {
        success: result.created > 0,
        message: `Import selesai: ${summaryMsg}`,
        result,
      },
      { status: statusCode },
    );
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── GET /api/kencleng/import ─────────────────────────────────
/**
 * Download template Excel kosong untuk panduan format import.
 *
 * File template berisi:
 * - Baris header: no_kencleng | nama | ranting | alamat
 * - 2 baris contoh data
 *
 * Response: file .xlsx dengan Content-Disposition: attachment
 */
export async function GET() {
  try {
    const buffer = wargaService.getExcelTemplate();

    // Nama file template dengan tanggal hari ini
    const date = new Date().toISOString().slice(0, 10); // "2024-01-15"
    const filename = `template_import_warga_${date}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        // Paksa browser untuk download (bukan buka di tab baru)
        "Content-Disposition": `attachment; filename="${filename}"`,
        // MIME type untuk file Excel modern (.xlsx)
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // Ukuran file untuk progress bar download
        "Content-Length": String(buffer.length),
        // Cache: jangan cache template (bisa berubah)
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
