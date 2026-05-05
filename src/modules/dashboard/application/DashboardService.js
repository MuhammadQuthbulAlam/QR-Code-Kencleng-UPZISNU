// ============================================================
// src/modules/dashboard/application/DashboardService.js
// Application Layer: Agregasi data untuk Dashboard Admin
//
// Menggunakan Promise.all secara ekstensif agar semua query
// berjalan paralel — dashboard akan load secepat query terlambat,
// bukan jumlah semua query (signifikan untuk banyak widget).
//
// Data yang dikumpulkan:
//   - KPI utama (total pemasukan, transaksi, warga, ranting)
//   - Perbandingan periode (bulan ini vs bulan lalu)
//   - Tren harian (line chart)
//   - Distribusi per ranting (bar chart + pie chart)
//   - Distribusi metode pembayaran (doughnut chart)
//   - Tabel transaksi terbaru
// ============================================================

import { db } from "@/infrastructure/database/db";

export class DashboardService {
  /**
   * getData — Ambil SEMUA data dashboard dalam satu panggilan
   *
   * Semua query dijalankan paralel menggunakan Promise.all.
   *
   * @param {object} filters
   * @param {string} filters.dateFrom  — ISO date string "YYYY-MM-DD"
   * @param {string} filters.dateTo    — ISO date string "YYYY-MM-DD"
   * @param {string} filters.ranting   — filter per ranting (opsional)
   * @returns {Promise<DashboardData>}
   */
  async getData({ dateFrom, dateTo, ranting, cabangId } = {}) {
    // ── Normalisasi rentang tanggal ──────────────────────────
    const now = new Date();

    // Default: 30 hari terakhir jika tidak ada filter
    const startDate = dateFrom
      ? new Date(dateFrom + "T00:00:00.000Z")
      : new Date(now.getFullYear(), now.getMonth(), 1); // Awal bulan ini

    const endDate = dateTo
      ? new Date(dateTo + "T23:59:59.999Z")
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Akhir bulan ini

    // ── Periode bulan lalu untuk perbandingan ────────────────
    const prevStart = new Date(startDate);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(endDate);
    prevEnd.setMonth(prevEnd.getMonth() - 1);

    // ── Where clause dasar (reusable) ────────────────────────
    const baseWhere = {
      status: "SUKSES",
      createdAt: { gte: startDate, lte: endDate },
      ...(ranting && { ranting: { contains: ranting, mode: "insensitive" } }),
      ...(cabangId && { cabangId }), // ← filter cabang
    };

    const prevWhere = {
      status: "SUKSES",
      createdAt: { gte: prevStart, lte: prevEnd },
      ...(ranting && { ranting: { contains: ranting, mode: "insensitive" } }),
      ...(cabangId && { cabangId }), // ← filter cabang
    };

    // ════════════════════════════════════════════════════════
    // JALANKAN SEMUA QUERY PARALEL
    // ════════════════════════════════════════════════════════
    const [
      // KPI periode ini
      kpiPeriode,
      // KPI periode lalu (untuk % perubahan)
      kpiPrevPeriode,
      // Semua warga (total count)
      totalWarga,
      totalWargaAktif,
      // Tren harian: nominal per hari
      trenHarian,
      // Distribusi per ranting
      perRanting,
      // Distribusi metode pembayaran
      perMetode,
      // 10 transaksi terbaru
      transaksiTerbaru,
      // Jumlah transaksi pending
      transaksiPending,
    ] = await Promise.all([
      // ── KPI periode ini ────────────────────────────────────
      db.transaksi.aggregate({
        where: baseWhere,
        _sum: { nominal: true },
        _count: { id: true },
        _avg: { nominal: true },
        _max: { nominal: true },
      }),

      // ── KPI periode lalu ───────────────────────────────────
      db.transaksi.aggregate({
        where: prevWhere,
        _sum: { nominal: true },
        _count: { id: true },
      }),

      // ── Total warga (filter per cabang jika ada) ──────────────
      db.warga.count({ where: cabangId ? { cabangId } : undefined }),

      // ── Warga aktif ────────────────────────────────────────
      db.warga.count({
        where: { isActive: true, ...(cabangId && { cabangId }) },
      }),

      // ── Tren nominal harian ────────────────────────────────
      // Ambil transaksi dalam rentang, lalu aggregate di JS
      // (groupBy tanggal tidak native di Prisma tanpa raw query)
      db.transaksi.findMany({
        where: baseWhere,
        select: { createdAt: true, nominal: true },
        orderBy: { createdAt: "asc" },
      }),

      // ── Per ranting ────────────────────────────────────────
      db.transaksi.groupBy({
        by: ["ranting"],
        where: baseWhere,
        _sum: { nominal: true },
        _count: { id: true },
        orderBy: { _sum: { nominal: "desc" } },
        take: 10, // Top 10 ranting
      }),

      // ── Per metode pembayaran ──────────────────────────────
      db.transaksi.groupBy({
        by: ["metodePembayaran"],
        where: baseWhere,
        _sum: { nominal: true },
        _count: { id: true },
      }),

      // ── Transaksi terbaru ──────────────────────────────────
      db.transaksi.findMany({
        where: baseWhere,
        select: {
          id: true,
          namaWarga: true,
          ranting: true,
          noKencleng: true,
          qrCode: true,
          nominal: true,
          metodePembayaran: true,
          status: true,
          petugasNama: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // ── Transaksi pending ──────────────────────────────────
      db.transaksi.count({ where: { status: "PENDING" } }),
    ]);

    // ════════════════════════════════════════════════════════
    // POST-PROCESSING
    // ════════════════════════════════════════════════════════

    // ── Hitung % perubahan dari periode lalu ─────────────────
    const nominalIni = kpiPeriode._sum.nominal ?? 0;
    const nominalPrev = kpiPrevPeriode._sum.nominal ?? 0;
    const countIni = kpiPeriode._count.id ?? 0;
    const countPrev = kpiPrevPeriode._count.id ?? 0;

    const nominalChange =
      nominalPrev > 0
        ? ((nominalIni - nominalPrev) / nominalPrev) * 100
        : nominalIni > 0
          ? 100
          : 0;

    const countChange =
      countPrev > 0
        ? ((countIni - countPrev) / countPrev) * 100
        : countIni > 0
          ? 100
          : 0;

    // ── Aggregate tren harian ─────────────────────────────────
    // Kelompokkan transaksi per tanggal (YYYY-MM-DD)
    const dailyMap = new Map();

    trenHarian.forEach((t) => {
      const dateKey = t.createdAt.toISOString().slice(0, 10); // "2025-01-15"
      const existing = dailyMap.get(dateKey) || { nominal: 0, count: 0 };
      dailyMap.set(dateKey, {
        nominal: existing.nominal + t.nominal,
        count: existing.count + 1,
      });
    });

    // Buat array lengkap setiap hari dalam rentang (termasuk hari tanpa transaksi = 0)
    const dailyData = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) || { nominal: 0, count: 0 };
      dailyData.push({
        tanggal: key,
        label: cursor.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        nominal: entry.nominal,
        count: entry.count,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // ── Format per ranting ────────────────────────────────────
    const rantingData = perRanting.map((r) => ({
      ranting: r.ranting,
      totalNominal: r._sum.nominal ?? 0,
      totalCount: r._count.id ?? 0,
      avgNominal:
        r._count.id > 0 ? Math.round((r._sum.nominal ?? 0) / r._count.id) : 0,
    }));

    // ── Format metode pembayaran ──────────────────────────────
    const metodeData = perMetode.map((m) => ({
      metode: m.metodePembayaran,
      totalNominal: m._sum.nominal ?? 0,
      totalCount: m._count.id ?? 0,
    }));

    // ── Format transaksi terbaru ──────────────────────────────
    const transaksiFormatted = transaksiTerbaru.map((t) => ({
      ...t,
      nominalFormatted: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(t.nominal),
      tanggal: new Date(t.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    // ── Hitung distribusi ranting untuk pie chart ─────────────
    const totalNominalRanting = rantingData.reduce(
      (s, r) => s + r.totalNominal,
      0,
    );
    const rantingWithPercent = rantingData.map((r) => ({
      ...r,
      percent:
        totalNominalRanting > 0
          ? ((r.totalNominal / totalNominalRanting) * 100).toFixed(1)
          : "0.0",
    }));

    // ════════════════════════════════════════════════════════
    // RETURN FINAL PAYLOAD
    // ════════════════════════════════════════════════════════
    return {
      // ── Metadata filter ──────────────────────────────────
      filter: {
        dateFrom: startDate.toISOString().slice(0, 10),
        dateTo: endDate.toISOString().slice(0, 10),
        ranting: ranting ?? null,
        cabangId: cabangId ?? null, // ← baru
      },

      // ── KPI Cards ─────────────────────────────────────────
      kpi: {
        totalPemasukan: {
          nilai: nominalIni,
          prev: nominalPrev,
          change: parseFloat(nominalChange.toFixed(1)),
          isUp: nominalChange >= 0,
        },
        totalTransaksi: {
          nilai: countIni,
          prev: countPrev,
          change: parseFloat(countChange.toFixed(1)),
          isUp: countChange >= 0,
        },
        rataRata: {
          nilai: Math.round(kpiPeriode._avg.nominal ?? 0),
          max: kpiPeriode._max.nominal ?? 0,
        },
        totalWarga: {
          nilai: totalWarga,
          aktif: totalWargaAktif,
          nonaktif: totalWarga - totalWargaAktif,
        },
        pending: transaksiPending,
      },

      // ── Tren harian (line chart) ───────────────────────────
      trenHarian: dailyData,

      // ── Per ranting (bar + pie chart) ─────────────────────
      perRanting: rantingWithPercent,

      // ── Per metode pembayaran (doughnut chart) ────────────
      perMetode: metodeData,

      // ── Tabel transaksi terbaru ────────────────────────────
      transaksiTerbaru: transaksiFormatted,

      // ── Timestamp response ────────────────────────────────
      generatedAt: new Date().toISOString(),
    };
  }
}

export const dashboardService = new DashboardService();
