"use client";
// ============================================================
// src/app/dashboard/page.jsx
// Admin Dashboard — Data Realtime Kencleng NU
//
// Arsitektur komponen:
//   useDashboard()  → custom hook: fetch + auto-refresh 30s
//   FilterBar       → date range + ranting + preset buttons
//   KpiCard         → metrik utama + % perubahan
//   TrendChart      → line chart tren harian (Chart.js)
//   RantingChart    → horizontal bar per ranting (Chart.js)
//   MetodeChart     → doughnut metode pembayaran (Chart.js)
//   RantingTable    → tabel ringkasan per ranting
//   TransaksiTable  → 10 transaksi terbaru
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FiBarChart2,
  FiSmartphone,
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiClipboard,
  FiHome,
  FiRefreshCw,
  FiClock,
  FiAlertTriangle,
  FiTrendingUp,
  FiCreditCard,
  FiInbox,
} from "react-icons/fi";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const NU_COLORS = [
  "#1a7a3c",
  "#2d9e57",
  "#4db582",
  "#f5a623",
  "#7dcca4",
  "#d97706",
  "#065f46",
  "#92400e",
  "#0f4522",
  "#b3e5c8",
];
const REFRESH_MS = 30_000;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatRp(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000_000) return `Rp ${(n / 1e9).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1e6).toFixed(1)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1e3).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
function formatRpFull(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);
}
function getDefaultDates() {
  const now = new Date();
  return {
    dateFrom: new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    dateTo: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────
// HOOK: useDashboard
// ─────────────────────────────────────────────────────────────
function useDashboard(filters) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timer = useRef(null);

  const fetchData = useCallback(
    async (bg = false) => {
      if (!bg) setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams(
          Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        ).toString();
        const res = await fetch(`/api/dashboard?${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setData(json.data);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    },
    [JSON.stringify(filters)],
  ); // eslint-disable-line

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh background
  useEffect(() => {
    timer.current = setInterval(() => fetchData(true), REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refetch: () => fetchData(false) };
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: KpiCard
// ─────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  sub,
  change,
  isUp,
  loading,
  accent = false,
}) {
  return (
    <div
      className={`rounded-2xl p-5 border transition-all ${
        accent
          ? "bg-gradient-to-br from-nu-green-700 to-nu-green-900 text-white border-transparent shadow-nu-lg"
          : "bg-white border-nu-green-100 shadow-sm hover:shadow-nu"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl
          ${accent ? "bg-white/15" : "bg-nu-green-50"}`}
        >
          {icon}
        </div>
        {change !== undefined && !loading && (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              isUp
                ? accent
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-700"
                : accent
                  ? "bg-red-500/30 text-red-200"
                  : "bg-red-100 text-red-600"
            }`}
          >
            {isUp ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div
            className={`h-8 rounded-lg animate-pulse ${accent ? "bg-white/20" : "bg-nu-green-50"}`}
          />
          <div
            className={`h-4 w-24 rounded animate-pulse ${accent ? "bg-white/10" : "bg-nu-green-50"}`}
          />
        </div>
      ) : (
        <>
          <p
            className={`text-2xl font-bold leading-none mb-1 ${accent ? "text-white" : "text-nu-green-900"}`}
          >
            {value}
          </p>
          <p
            className={`text-sm font-medium ${accent ? "text-nu-green-200" : "text-nu-green-500"}`}
          >
            {label}
          </p>
          {sub && (
            <p
              className={`text-xs mt-1 ${accent ? "text-nu-green-300" : "text-nu-green-400"}`}
            >
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: FilterBar
// ─────────────────────────────────────────────────────────────
function FilterBar({
  filters,
  onChange,
  rantingList,
  cabangList,
  loading,
  lastUpdated,
  onRefresh,
}) {
  const presets = [
    {
      label: "Bulan Ini",
      fn: () => {
        const d = getDefaultDates();
        onChange({ ...filters, ...d });
      },
    },
    {
      label: "7 Hari",
      fn: () => {
        const to = new Date(),
          from = new Date();
        from.setDate(from.getDate() - 6);
        onChange({
          ...filters,
          dateFrom: from.toISOString().slice(0, 10),
          dateTo: to.toISOString().slice(0, 10),
        });
      },
    },
    {
      label: "30 Hari",
      fn: () => {
        const to = new Date(),
          from = new Date();
        from.setDate(from.getDate() - 29);
        onChange({
          ...filters,
          dateFrom: from.toISOString().slice(0, 10),
          dateTo: to.toISOString().slice(0, 10),
        });
      },
    },
    {
      label: "Tahun Ini",
      fn: () => {
        const y = new Date().getFullYear();
        onChange({ ...filters, dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` });
      },
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 shadow-sm p-4 space-y-3">
      {/* Baris 1: presets + tanggal */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={p.fn}
              className="px-3 py-1.5 rounded-xl border border-nu-green-200 text-nu-green-600
                         text-xs font-semibold hover:bg-nu-green-600 hover:text-white
                         hover:border-transparent transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-nu-green-100 hidden sm:block" />

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="input-field text-sm py-2 w-36"
          />
          <span className="text-nu-green-400">—</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="input-field text-sm py-2 w-36"
          />
        </div>

        {/* ── Filter Cabang ← baru ──────────────────────────── */}
        {cabangList?.length > 0 && (
          <select
            value={filters.cabangId ?? ""}
            onChange={(e) =>
              onChange({ ...filters, cabangId: e.target.value || undefined })
            }
            className="input-field text-sm py-2 min-w-44"
          >
            <option value="">
              <FiHome /> Semua Cabang
            </option>
            {/* Group by daerah */}
            {Object.entries(
              cabangList.reduce((acc, c) => {
                if (!acc[c.daerah]) acc[c.daerah] = [];
                acc[c.daerah].push(c);
                return acc;
              }, {}),
            ).map(([daerah, cabs]) => (
              <optgroup key={daerah} label={daerah}>
                {cabs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namaLengkap ?? c.nama}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {rantingList?.length > 0 && (
          <select
            value={filters.ranting}
            onChange={(e) => onChange({ ...filters, ranting: e.target.value })}
            className="input-field text-sm py-2 min-w-36"
          >
            <option value="">Semua Ranting</option>
            {rantingList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {lastUpdated && (
            <span className="text-xs text-nu-green-400 hidden sm:block tabular-nums">
              ⏱ {lastUpdated.toLocaleTimeString("id-ID")}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-nu-green-50 hover:bg-nu-green-100
                       text-nu-green-600 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Realtime dot */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-nu-green-50">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-xs text-nu-green-400">
          Auto-refresh setiap {REFRESH_MS / 1000}s
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: TrendChart — Line chart tren harian
// ─────────────────────────────────────────────────────────────
function TrendChart({ data, loading }) {
  const ref = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    if (!data || loading) return;
    let destroyed = false;

    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (destroyed) return;
      chart.current?.destroy();

      const ctx = ref.current?.getContext("2d");
      if (!ctx) return;

      const grad = ctx.createLinearGradient(0, 0, 0, 280);
      grad.addColorStop(0, "rgba(26,122,60,0.28)");
      grad.addColorStop(1, "rgba(26,122,60,0.00)");

      chart.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: data.map((d) => d.label),
          datasets: [
            {
              label: "Nominal (Rp)",
              data: data.map((d) => d.nominal),
              borderColor: "#1a7a3c",
              backgroundColor: grad,
              borderWidth: 2.5,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#1a7a3c",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f4522",
              titleColor: "#9fcfb1",
              bodyColor: "#fff",
              borderColor: "#1a7a3c",
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: (ctx) => " " + formatRpFull(ctx.raw),
                afterLabel: (ctx) => {
                  const e = data[ctx.dataIndex];
                  return e ? ` ${e.count}x transaksi` : "";
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: "#5a9974",
                font: { size: 11 },
                maxRotation: 45,
                maxTicksLimit: 12,
              },
            },
            y: {
              grid: { color: "rgba(26,122,60,0.06)" },
              beginAtZero: true,
              ticks: {
                color: "#5a9974",
                font: { size: 11 },
                callback: (v) => formatRp(v),
              },
            },
          },
        },
      });
    })();

    return () => {
      destroyed = true;
      chart.current?.destroy();
      chart.current = null;
    };
  }, [data, loading]);

  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-nu-green-900">📈 Tren Setoran Harian</h3>
        <p className="text-xs text-nu-green-400 mt-0.5">
          Nominal terkumpul per hari dalam periode ini
        </p>
      </div>
      {loading ? (
        <div className="h-64 bg-nu-green-50 animate-pulse rounded-xl" />
      ) : !data?.length ? (
        <div className="h-64 flex items-center justify-center text-nu-green-300 text-sm">
          Tidak ada data
        </div>
      ) : (
        <div className="h-64">
          <canvas ref={ref} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: RantingChart — Horizontal bar
// ─────────────────────────────────────────────────────────────
function RantingChart({ data, loading }) {
  const ref = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    if (!data || loading) return;
    const top = data.slice(0, 8);
    let destroyed = false;

    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (destroyed) return;
      chart.current?.destroy();

      const ctx = ref.current?.getContext("2d");
      if (!ctx) return;

      chart.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: top.map((r) => r.ranting),
          datasets: [
            {
              label: "Total Setoran",
              data: top.map((r) => r.totalNominal),
              backgroundColor: top.map(
                (_, i) => NU_COLORS[i % NU_COLORS.length],
              ),
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f4522",
              titleColor: "#9fcfb1",
              bodyColor: "#fff",
              callbacks: {
                label: (ctx) => " " + formatRpFull(ctx.raw),
                afterLabel: (ctx) => {
                  const r = top[ctx.dataIndex];
                  return r ? ` ${r.totalCount}x transaksi` : "";
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(26,122,60,0.06)" },
              beginAtZero: true,
              ticks: {
                color: "#5a9974",
                font: { size: 11 },
                callback: (v) => formatRp(v),
              },
            },
            y: {
              grid: { display: false },
              ticks: { color: "#2d5a3d", font: { size: 11, weight: "500" } },
            },
          },
        },
      });
    })();

    return () => {
      destroyed = true;
      chart.current?.destroy();
      chart.current = null;
    };
  }, [data, loading]);

  const barH = Math.max(200, Math.min(data?.length ?? 0, 8) * 44);

  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-nu-green-900">
          <FiHome /> Setoran per Ranting
        </h3>
        <p className="text-xs text-nu-green-400 mt-0.5">
          Top 8 ranting berdasarkan total nominal
        </p>
      </div>
      {loading ? (
        <div className="h-64 bg-nu-green-50 animate-pulse rounded-xl" />
      ) : !data?.length ? (
        <div className="h-64 flex items-center justify-center text-nu-green-300 text-sm">
          Belum ada data
        </div>
      ) : (
        <div style={{ height: `${barH}px` }}>
          <canvas ref={ref} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: MetodeChart — Doughnut
// ─────────────────────────────────────────────────────────────
function MetodeChart({ data, loading, total }) {
  const ref = useRef(null);
  const chart = useRef(null);
  const CLR = { TUNAI: "#1a7a3c", TRANSFER: "#f5a623", LAINNYA: "#7dcca4" };
  const LBL = {
    TUNAI: <FiDollarSign /> + " Tunai",
    TRANSFER: <FiSmartphone /> + " Transfer",
    LAINNYA: <FiRefreshCw /> + " Lainnya",
  };

  useEffect(() => {
    if (!data || loading) return;
    let destroyed = false;

    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (destroyed) return;
      chart.current?.destroy();

      const ctx = ref.current?.getContext("2d");
      if (!ctx) return;

      chart.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: data.map((m) => LBL[m.metode] ?? m.metode),
          datasets: [
            {
              data: data.map((m) => m.totalNominal),
              backgroundColor: data.map((m) => CLR[m.metode] ?? "#999"),
              borderColor: "#fff",
              borderWidth: 3,
              hoverBorderWidth: 4,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#2d5a3d",
                font: { size: 12, weight: "500" },
                padding: 16,
                usePointStyle: true,
                pointStyleWidth: 8,
              },
            },
            tooltip: {
              backgroundColor: "#0f4522",
              bodyColor: "#fff",
              callbacks: {
                label: (ctx) => {
                  const pct =
                    total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : "0.0";
                  return ` ${formatRpFull(ctx.raw)} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    })();

    return () => {
      destroyed = true;
      chart.current?.destroy();
      chart.current = null;
    };
  }, [data, loading, total]);

  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-nu-green-900">
          <FiDollarSign /> Metode Pembayaran
        </h3>
        <p className="text-xs text-nu-green-400 mt-0.5">
          Distribusi metode setoran
        </p>
      </div>
      {loading ? (
        <div className="h-48 bg-nu-green-50 animate-pulse rounded-xl" />
      ) : !data?.length ? (
        <div className="h-48 flex items-center justify-center text-nu-green-300 text-sm">
          Belum ada data
        </div>
      ) : (
        <div className="h-52">
          <canvas ref={ref} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: RantingTable
// ─────────────────────────────────────────────────────────────
function RantingTable({ data, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-nu-green-50">
        <h3 className="font-bold text-nu-green-900">
          <FiBarChart2 /> Ringkasan per Ranting
        </h3>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-nu-green-50 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="p-8 text-center text-nu-green-300 text-sm">
          Belum ada data ranting
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-nu-green-50 text-nu-green-500 text-xs uppercase tracking-wide">
                {[
                  "#",
                  "Ranting",
                  "Transaksi",
                  "Total Setoran",
                  "Rata-rata",
                  "%",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr
                  key={r.ranting}
                  className="border-t border-nu-green-50 hover:bg-nu-green-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-nu-green-400 font-mono text-xs">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: NU_COLORS[i % NU_COLORS.length],
                        }}
                      />
                      <span className="font-medium text-nu-green-800">
                        {r.ranting}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-nu-green-600">
                    {r.totalCount}x
                  </td>
                  <td className="px-4 py-3 font-bold text-nu-green-900">
                    {formatRpFull(r.totalNominal)}
                  </td>
                  <td className="px-4 py-3 text-nu-green-500">
                    {formatRp(r.avgNominal)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-nu-green-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-nu-green-500 rounded-full transition-all"
                          style={{ width: `${r.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-nu-green-500 w-10 text-right">
                        {r.percent}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: TransaksiTable
// ─────────────────────────────────────────────────────────────
function TransaksiTable({ data, loading }) {
  const SC = {
    SUKSES: { cls: "bg-emerald-100 text-emerald-700", label: "Sukses" },
    PENDING: { cls: "bg-amber-100 text-amber-700", label: "Pending" },
    DIBATALKAN: { cls: "bg-red-100 text-red-600", label: "Dibatalkan" },
  };

  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-nu-green-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-nu-green-900">
            <FiClock /> Transaksi Terbaru
          </h3>
          <p className="text-xs text-nu-green-400 mt-0.5">
            10 setoran paling baru
          </p>
        </div>
        <Link
          href="/transaksi"
          className="text-xs font-semibold text-nu-green-600 bg-nu-green-50
                     hover:bg-nu-green-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          Lihat Semua →
        </Link>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-nu-green-50 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="p-12 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-nu-green-400 text-sm font-medium mb-4">
            Belum ada transaksi di periode ini
          </p>
          <Link href="/scan" className="btn-primary text-sm">
            <FiSmartphone /> Mulai Scan
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-nu-green-50 text-nu-green-500 text-xs uppercase">
                  {[
                    "Warga",
                    "Ranting",
                    "QR Code",
                    "Nominal",
                    "Metode",
                    "Status",
                    "Waktu",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((t) => {
                  const sc = SC[t.status] ?? SC.PENDING;
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-nu-green-50 hover:bg-nu-green-50/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full bg-nu-green-600 text-white
                                          flex items-center justify-center text-xs font-bold flex-shrink-0"
                          >
                            {t.namaWarga
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-nu-green-900 text-xs">
                              {t.namaWarga}
                            </p>
                            <p className="text-nu-green-400 text-xs font-mono">
                              {t.noKencleng}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-nu-green-600 text-xs">
                        {t.ranting}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-nu-green-500">
                        {t.qrCode}
                      </td>
                      <td className="px-4 py-3 font-bold text-nu-green-900">
                        {t.nominalFormatted}
                      </td>
                      <td className="px-4 py-3 text-nu-green-500 text-xs">
                        {t.metodePembayaran}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${sc.cls}`}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-nu-green-400 text-xs whitespace-nowrap">
                        {t.tanggal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-nu-green-50">
            {data.map((t) => {
              const sc = SC[t.status] ?? SC.PENDING;
              return (
                <div key={t.id} className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-nu-green-600 text-white
                                  flex items-center justify-center text-xs font-bold flex-shrink-0"
                  >
                    {t.namaWarga
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-nu-green-900 text-sm truncate">
                      {t.namaWarga}
                    </p>
                    <p className="text-xs text-nu-green-400">
                      {t.ranting} · {t.tanggal}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-nu-green-800 text-sm">
                      {t.nominalFormatted}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}
                    >
                      {sc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HALAMAN UTAMA
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const defaults = getDefaultDates();
  const [filters, setFilters] = useState({
    dateFrom: defaults.dateFrom,
    dateTo: defaults.dateTo,
    ranting: "",
  });
  const { data, loading, error, lastUpdated, refetch } = useDashboard(filters);

  const kpi = data?.kpi;
  const rantingList = useMemo(
    () => data?.perRanting?.map((r) => r.ranting) ?? [],
    [data],
  );

  return (
    <div className="min-h-screen bg-nu-cream-50">
      <div className="flex">
        {/* ── Sidebar Desktop ─────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col w-60 min-h-screen bg-nu-green-950
                           fixed top-0 left-0 z-30 shadow-2xl"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 bg-nu-gold-500 rounded-xl flex items-center
                              justify-center text-xl shadow-lg"
              >
                ☪️
              </div>
              <div>
                <p className="text-white font-bold text-sm">Portal NU</p>
                <p className="text-nu-green-400 text-xs">Admin</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {[
              {
                href: "/dashboard",
                icon: <FiBarChart2 />,
                label: "Dashboard",
                active: true,
              },
              { href: "/scan", icon: <FiSmartphone />, label: "Scan QR" },
              {
                href: "/transaksi",
                icon: <FiDollarSign />,
                label: "Transaksi",
              },
              {
                href: "/dashboard/kencleng",
                icon: <FiUsers />,
                label: "Data Warga",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                  ${
                    item.active
                      ? "bg-nu-green-600 text-white"
                      : "text-nu-green-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.active && (
                  <span className="ml-auto w-1.5 h-1.5 bg-nu-gold-400 rounded-full" />
                )}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 bg-nu-green-600 rounded-full flex items-center
                              justify-center text-white font-bold text-sm"
              >
                A
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  Administrator
                </p>
                <p className="text-nu-green-400 text-xs">admin@nu.or.id</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────── */}
        <div className="flex-1 lg:ml-60">
          {/* Topbar */}
          <header
            className="sticky top-0 z-20 bg-white/90 backdrop-blur-md
                             border-b border-nu-green-100 shadow-sm"
          >
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="text-nu-gold-500 text-2xl">☪️</span>
                <span className="font-bold text-nu-green-900">
                  Dashboard Admin
                </span>
              </div>
              <div className="hidden lg:block">
                <h1 className="font-bold text-nu-green-900 text-xl font-display">
                  Dashboard Admin
                </h1>
                <p className="text-nu-green-400 text-xs">
                  Sistem Kencleng Nahdlatul Ulama
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/scan"
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <span>
                    <FiSmartphone />
                  </span>
                  <span className="hidden sm:inline">Scan QR</span>
                </Link>
                <Link
                  href="/transaksi"
                  className="btn-secondary text-sm py-2 px-4 hidden sm:flex items-center gap-2"
                >
                  <span>
                    <FiDollarSign />
                  </span>{" "}
                  Transaksi
                </Link>
              </div>
            </div>
          </header>

          {/* Body */}
          <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Error */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-sm">
                <span className="text-2xl">
                  <FiAlertTriangle />
                </span>
                <div>
                  <p className="font-semibold text-red-700">
                    Gagal memuat data
                  </p>
                  <p className="text-xs text-red-500">{error}</p>
                </div>
                <button
                  onClick={refetch}
                  className="ml-auto px-3 py-1.5 bg-red-100 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-200"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* FilterBar */}
            <FilterBar
              filters={filters}
              onChange={setFilters}
              rantingList={rantingList}
              loading={loading}
              lastUpdated={lastUpdated}
              onRefresh={refetch}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                accent
                icon={<FiDollarSign />}
                label="Total Pemasukan"
                value={loading ? "—" : formatRpFull(kpi?.totalPemasukan?.nilai)}
                sub={
                  loading
                    ? ""
                    : `vs ${formatRp(kpi?.totalPemasukan?.prev)} periode lalu`
                }
                change={kpi?.totalPemasukan?.change}
                isUp={kpi?.totalPemasukan?.isUp}
                loading={loading}
              />
              <KpiCard
                icon={<FiFileText />}
                label="Jumlah Transaksi"
                value={
                  loading
                    ? "—"
                    : `${(kpi?.totalTransaksi?.nilai ?? 0).toLocaleString("id-ID")}x`
                }
                sub={
                  loading
                    ? ""
                    : ` vs ${kpi?.totalTransaksi?.prev ?? 0}x periode lalu`
                }
                change={kpi?.totalTransaksi?.change}
                isUp={kpi?.totalTransaksi?.isUp}
                loading={loading}
              />
              <KpiCard
                icon={<FiUsers />}
                label="Warga Terdaftar"
                value={
                  loading
                    ? "—"
                    : (kpi?.totalWarga?.nilai ?? 0).toLocaleString("id-ID")
                }
                sub={loading ? "" : ` ${kpi?.totalWarga?.aktif ?? 0} aktif`}
                loading={loading}
              />
              <KpiCard
                icon={<FiBarChart2 />}
                label="Rata-rata Setoran"
                value={loading ? "—" : formatRp(kpi?.rataRata?.nilai)}
                sub={loading ? "" : ` Maks: ${formatRp(kpi?.rataRata?.max)}`}
                loading={loading}
              />
            </div>

            {/* Alert pending */}
            {!loading && (kpi?.pending ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
                <span className="text-2xl">
                  <FiAlertTriangle />
                </span>
                <span className="text-amber-800 font-medium text-sm">
                  {kpi.pending} transaksi menunggu konfirmasi
                </span>
                <Link
                  href="/transaksi?status=PENDING"
                  className="ml-auto text-xs font-bold text-amber-700 bg-amber-100
                             hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Tinjau →
                </Link>
              </div>
            )}

            {/* Charts baris 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <TrendChart data={data?.trenHarian} loading={loading} />
              </div>
              <MetodeChart
                data={data?.perMetode}
                loading={loading}
                total={kpi?.totalPemasukan?.nilai ?? 0}
              />
            </div>

            {/* Charts baris 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <RantingChart data={data?.perRanting} loading={loading} />
              <RantingTable data={data?.perRanting} loading={loading} />
            </div>

            {/* Tabel transaksi */}
            <TransaksiTable data={data?.transaksiTerbaru} loading={loading} />

            {/* Footer */}
            <div className="text-center pt-4 pb-8">
              <p className="text-xs text-nu-green-300">
                Portal Digital Nahdlatul Ulama — Hubbul Wathon Minal Iman
              </p>
              {data?.generatedAt && (
                <p className="text-xs text-nu-green-200 mt-1">
                  Data: {new Date(data.generatedAt).toLocaleString("id-ID")}
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
