// ============================================================
// src/app/api/kencleng/export/route.js
// API Route: GET /api/kencleng/export — download data warga ke Excel
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/infrastructure/database/db";
import { formatErrorResponse } from "@/core/errors/AppError";
import * as XLSX from "xlsx";

// ── GET /api/kencleng/export ─────────────────────────────────
/**
 * Export seluruh data warga ke file Excel (.xlsx).
 *
 * Query params (opsional, untuk filter):
 *   ranting : filter per ranting
 *   active  : "true" | "false"
 *
 * Response: file .xlsx sebagai download
 *
 * Kolom Excel yang dihasilkan:
 *   No | No Kencleng | QR Code | Nama | Ranting | Alamat | Status | Tgl Daftar
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ranting = searchParams.get("ranting");
    const active = searchParams.get("active");

    // ── Ambil data dari database ──────────────────────────
    const where = {
      ...(ranting && { ranting: { equals: ranting, mode: "insensitive" } }),
      ...(active !== null &&
        active !== "" && {
          isActive: active === "true",
        }),
    };

    const rows = await db.warga.findMany({
      where,
      orderBy: { no_kencleng: "asc" },
      select: {
        // Pilih field yang relevan untuk ekspor
        no_kencleng: true,
        qr_code: true,
        nama: true,
        ranting: true,
        alamat: true,
        isActive: true,
        createdAt: true,
        // qr_image sengaja tidak di-export (terlalu besar)
      },
    });

    // ── Susun data untuk Excel ────────────────────────────
    // Setiap row dikonversi ke plain object dengan label kolom yang rapi
    const excelData = rows.map((row, index) => ({
      No: index + 1,
      "No Kencleng": row.no_kencleng,
      "QR Code": row.qr_code,
      Nama: row.nama,
      Ranting: row.ranting,
      Alamat: row.alamat,
      Status: row.isActive ? "Aktif" : "Nonaktif",
      "Tanggal Daftar": new Date(row.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    }));

    // ── Buat workbook Excel ───────────────────────────────
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Atur lebar kolom agar mudah dibaca
    worksheet["!cols"] = [
      { width: 5 }, // No
      { width: 15 }, // No Kencleng
      { width: 12 }, // QR Code
      { width: 30 }, // Nama
      { width: 25 }, // Ranting
      { width: 50 }, // Alamat
      { width: 10 }, // Status
      { width: 20 }, // Tanggal Daftar
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");

    // Tambahkan sheet ringkasan
    const summaryData = [
      { Keterangan: "Total Warga", Jumlah: rows.length },
      {
        Keterangan: "Warga Aktif",
        Jumlah: rows.filter((r) => r.isActive).length,
      },
      {
        Keterangan: "Warga Nonaktif",
        Jumlah: rows.filter((r) => !r.isActive).length,
      },
      {
        Keterangan: "Tanggal Export",
        Jumlah: new Date().toLocaleDateString("id-ID"),
      },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

    // ── Konversi ke Buffer ────────────────────────────────
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `data_warga_kencleng_${date}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error) {
    const { status, body } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
