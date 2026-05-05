// ============================================================
// src/app/api/kencleng/qrcode/route.js
// API Route: POST /api/kencleng/qrcode        — generate QR preview
//            GET  /api/kencleng/qrcode?code=  — ambil QR dari DB by code
// ============================================================

import { NextResponse } from "next/server";
import { wargaService } from "@/modules/kencleng/application/WargaService";
import {
  generateQrCode,
  generateQrCodeSvg,
  isValidQrCode,
  formatQrCode,
} from "@/core/qrcode/qrGenerator";
import {
  formatErrorResponse,
  ValidationError,
  NotFoundError,
} from "@/core/errors/AppError";

// ── POST /api/kencleng/qrcode ────────────────────────────────
/**
 * Generate QR Code preview TANPA menyimpan ke database.
 * Berguna untuk:
 * - Preview sebelum membuat warga baru
 * - Cetak ulang QR yang sudah ada
 * - Generate QR on-demand dari frontend
 *
 * Request body (JSON):
 * {
 *   "no_kencleng": "0042",   ← Wajib
 *   "format":      "png"     ← Opsional: "png" (default) | "svg"
 * }
 *
 * Response 200 (format=png):
 * {
 *   success: true,
 *   qr_code:  "UPZ-0042",
 *   qr_image: "data:image/png;base64,...",  ← Langsung pakai di <img>
 *   format:   "png"
 * }
 *
 * Response 200 (format=svg):
 * {
 *   success:  true,
 *   qr_code:  "UPZ-0042",
 *   qr_svg:   "<svg>...</svg>",  ← SVG string (render langsung di HTML)
 *   format:   "svg"
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { no_kencleng, format = "png" } = body;

    // Validasi: no_kencleng wajib ada
    if (!no_kencleng) {
      throw new ValidationError("no_kencleng wajib diisi", [
        {
          field: "no_kencleng",
          message: "Nomor kencleng diperlukan untuk generate QR",
        },
      ]);
    }

    // Validasi format output
    if (!["png", "svg"].includes(format)) {
      throw new ValidationError("Format tidak valid", [
        { field: "format", message: "Format harus 'png' atau 'svg'" },
      ]);
    }

    // Format QR code canonical terlebih dahulu
    const qrCode = formatQrCode(String(no_kencleng));

    if (format === "svg") {
      // Generate QR sebagai SVG (ringan, scalable)
      const { qrSvg } = await generateQrCodeSvg(no_kencleng);
      return NextResponse.json({
        success: true,
        qr_code: qrCode,
        qr_svg: qrSvg,
        format: "svg",
      });
    } else {
      // Generate QR sebagai PNG (Data URL base64)
      const { qrImage } = await generateQrCode(no_kencleng);
      return NextResponse.json({
        success: true,
        qr_code: qrCode,
        qr_image: qrImage, // "data:image/png;base64,..."
        format: "png",
      });
    }
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// ── GET /api/kencleng/qrcode?code=UPZ-0042 ──────────────────
/**
 * Ambil data warga berdasarkan QR code (untuk fitur scan).
 *
 * Query param:
 *   code : string — kode hasil scan QR (e.g. "UPZ-0042")
 *
 * Juga mendukung:
 *   id   : string — jika ingin regenerate QR berdasarkan ID warga
 *
 * Response 200:
 * {
 *   success: true,
 *   data: { id, no_kencleng, nama, ranting, alamat, qr_code, qr_image }
 * }
 *
 * Response 400:
 * { success: false, message: "Format QR code tidak valid" }
 *
 * Response 404:
 * { success: false, message: "Warga tidak ditemukan" }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code"); // QR code untuk lookup
    const id = searchParams.get("id"); // ID warga untuk regenerate

    // ── Regenerate QR untuk warga by ID ──────────────────
    if (id) {
      const warga = await wargaService.regenerateQrCode(id);
      return NextResponse.json({
        success: true,
        message: `QR Code untuk "${warga.nama}" berhasil diperbarui`,
        data: warga,
      });
    }

    // ── Lookup warga by QR code (scan flow) ──────────────
    if (!code) {
      throw new ValidationError("Parameter 'code' atau 'id' wajib diisi");
    }

    // Validasi format kode
    if (!isValidQrCode(code)) {
      throw new ValidationError(`Format QR code tidak valid: "${code}"`, [
        {
          field: "code",
          message: `Format harus UPZ-XXXX (4 digit). Diterima: "${code}"`,
        },
      ]);
    }

    const warga = await wargaService.getWargaByQrCode(code);

    return NextResponse.json({ success: true, data: warga }, { status: 200 });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
