"use client";
// ============================================================
// src/app/transaksi/page.jsx
// Halaman Riwayat Transaksi — Mobile-First
//
// Fitur:
// - List semua transaksi (pagination)
// - Filter: periode, ranting, status, search
// - Kartu ringkasan total setoran bulan ini
// - Link ke halaman scan
// ============================================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────
function formatRp(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);
}

function formatTanggal(isoString) {
  return new Date(isoString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BULAN_NAMA = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// ── Status badge ──────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = {
    SUKSES: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      label: "Sukses",
    },
    PENDING: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-500",
      label: "Pending",
    },
    DIBATALKAN: {
      bg: "bg-red-100",
      text: "text-red-600",
      dot: "bg-red-400",
      label: "Dibatalkan",
    },
  }[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Kartu satu transaksi ──────────────────────────────────────
function TransaksiCard({ t, onBatalkan }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`
        bg-white rounded-2xl border transition-all duration-200
        ${expanded ? "border-nu-green-300 shadow-nu" : "border-nu-green-100 shadow-sm"}
      `}
    >
      {/* Baris utama — selalu tampil */}
      <button
        className="w-full p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Kiri: nama + ranting */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Avatar inisial */}
              <div
                className="w-9 h-9 rounded-full bg-nu-green-600 flex items-center
                              justify-center text-white font-bold text-sm flex-shrink-0"
              >
                {t.namaWarga
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-nu-green-900 text-sm truncate leading-tight">
                  {t.namaWarga}
                </p>
                <p className="text-nu-green-500 text-xs truncate">
                  {t.ranting}
                </p>
              </div>
            </div>
          </div>

          {/* Kanan: nominal + status */}
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-nu-green-800 text-base">
              {t.nominalFormatted}
            </p>
            <StatusChip status={t.status} />
          </div>
        </div>

        {/* Meta info singkat */}
        <div
          className="flex items-center justify-between mt-2 pt-2
                        border-t border-nu-green-50"
        >
          <span className="text-xs text-nu-green-400 font-mono">
            {t.qrCode}
          </span>
          <span className="text-xs text-nu-green-400">
            {formatTanggal(t.createdAt)}
          </span>
        </div>
      </button>

      {/* Detail expandable */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-nu-green-50 animate-fade-in">
          <div className="bg-nu-green-50 rounded-xl p-3 mt-3 space-y-2 text-sm">
            {[
              { label: "No. Kencleng", value: t.noKencleng, mono: true },
              { label: "Metode", value: t.metodePembayaran },
              { label: "Periode", value: t.periode },
              { label: "Petugas", value: t.petugasNama ?? "-" },
              { label: "Catatan", value: t.catatan || "-" },
              {
                label: "ID Transaksi",
                value: t.id.slice(-12),
                mono: true,
                dim: true,
              },
            ].map(({ label, value, mono, dim }) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-nu-green-400 flex-shrink-0">{label}</span>
                <span
                  className={`text-right ${mono ? "font-mono" : ""}
                  ${dim ? "text-nu-green-300 text-xs" : "text-nu-green-700 font-medium"}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Tombol batalkan */}
          {t.status === "PENDING" && (
            <button
              onClick={() => onBatalkan(t.id, t.namaWarga)}
              className="mt-3 w-full py-2 border border-red-300 text-red-500
                         rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              🚫 Batalkan Transaksi
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────
function FilterBar({ filters, onChange }) {
  const now = new Date();
  const bulanOpt = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl border border-nu-green-100 p-4 space-y-3 shadow-sm">
      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Cari nama / no. kencleng..."
        value={filters.search}
        onChange={(e) => onChange("search", e.target.value)}
        className="input-field text-sm"
      />

      {/* Periode */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={filters.bulan}
          onChange={(e) => onChange("bulan", e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Semua Bulan</option>
          {bulanOpt.map((b) => (
            <option key={b} value={b}>
              {BULAN_NAMA[b]}
            </option>
          ))}
        </select>
        <select
          value={filters.tahun}
          onChange={(e) => onChange("tahun", e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Semua Tahun</option>
          {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "Semua" },
          { value: "SUKSES", label: "✅ Sukses" },
          { value: "PENDING", label: "⏳ Pending" },
          { value: "DIBATALKAN", label: "🚫 Dibatalkan" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => onChange("status", s.value)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${
                filters.status === s.value
                  ? "bg-nu-green-600 text-white border-nu-green-600"
                  : "bg-white text-nu-green-600 border-nu-green-200 hover:border-nu-green-400"
              }
            `}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Komponen utama ────────────────────────────────────────────
export default function TransaksiPage() {
  const now = new Date();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    bulan: String(now.getMonth() + 1), // Default bulan ini
    tahun: String(now.getFullYear()),
    status: "",
  });

  // ── Fetch list transaksi ─────────────────────────────────
  const fetchTransaksi = useCallback(
    async (page = 1, overrideFilters) => {
      setLoading(true);
      try {
        const f = overrideFilters ?? filters;
        const qs = new URLSearchParams({
          page,
          limit: 20,
          ...(f.search && { search: f.search }),
          ...(f.bulan && { bulan: f.bulan }),
          ...(f.tahun && { tahun: f.tahun }),
          ...(f.status && { status: f.status }),
        }).toString();

        const res = await fetch(`/api/transaksi?${qs}`);
        const json = await res.json();

        if (json.success) {
          setList(json.data);
          setPagination({
            page: json.page,
            totalPages: json.totalPages,
            total: json.total,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  // ── Fetch stats ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    const res = await fetch(
      `/api/transaksi/stats?bulan=${bulan}&tahun=${tahun}`,
    );
    const json = await res.json();
    if (json.success) setStats(json.data);
  }, []);

  useEffect(() => {
    fetchTransaksi(1);
    fetchStats();
  }, []);

  // ── Ubah filter ──────────────────────────────────────────
  const handleFilterChange = useCallback(
    (key, value) => {
      const next = { ...filters, [key]: value };
      setFilters(next);
      fetchTransaksi(1, next); // Fetch ulang dari halaman 1
    },
    [filters, fetchTransaksi],
  );

  // ── Batalkan transaksi ───────────────────────────────────
  const handleBatalkan = async (id, nama) => {
    if (!confirm(`Batalkan transaksi dari ${nama}?`)) return;
    const res = await fetch(`/api/transaksi/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "batalkan" }),
    });
    const json = await res.json();
    if (json.success) fetchTransaksi(pagination.page);
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-nu-cream-50">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="bg-nu-green-600 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-nu-green-200 hover:text-white p-1"
          >
            ← Kembali
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-nu-gold-400">☪️</span>
            <h1 className="font-bold font-display text-lg">Riwayat Setoran</h1>
          </div>
          <Link
            href="/scan"
            className="bg-nu-gold-500 hover:bg-nu-gold-600 text-white px-3 py-1.5
                       rounded-full text-sm font-bold transition-colors"
          >
            📲 Scan
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-10 space-y-4 pt-4">
        {/* ── Summary card bulan ini ─────────────────────── */}
        {stats && (
          <div
            className="bg-gradient-to-br from-nu-green-700 to-nu-green-900
                          rounded-2xl p-5 text-white shadow-nu-lg animate-fade-in"
          >
            <p className="text-nu-green-300 text-sm mb-1">
              Total Setoran — {BULAN_NAMA[stats.periode.bulan]}{" "}
              {stats.periode.tahun}
            </p>
            <p className="text-4xl font-bold font-display">
              {formatRp(stats.bulanIni.totalNominal)}
            </p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-xs text-nu-green-300">Transaksi</p>
                <p className="font-bold">{stats.bulanIni.totalCount}x</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-xs text-nu-green-300">All Time</p>
                <p className="font-bold">
                  {formatRp(stats.allTime.totalNominal)}
                </p>
              </div>
              {stats.byRanting?.length > 0 && (
                <>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <p className="text-xs text-nu-green-300">Top Ranting</p>
                    <p className="font-bold text-xs leading-tight truncate max-w-24">
                      {stats.byRanting[0].ranting}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Toggle filter ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-nu-green-600 font-medium">
            {loading ? "Memuat..." : `${pagination.total} transaksi ditemukan`}
          </p>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              border-2 transition-all
              ${
                showFilter
                  ? "bg-nu-green-600 text-white border-nu-green-600"
                  : "bg-white text-nu-green-600 border-nu-green-200"
              }
            `}
          >
            ⚙️ Filter
            {(filters.search || filters.status) && (
              <span className="w-2 h-2 bg-nu-gold-500 rounded-full" />
            )}
          </button>
        </div>

        {/* ── Panel filter ───────────────────────────────── */}
        {showFilter && (
          <div className="animate-slide-up">
            <FilterBar filters={filters} onChange={handleFilterChange} />
          </div>
        )}

        {/* ── List transaksi ─────────────────────────────── */}
        {loading ? (
          // Skeleton loading cards
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-24 animate-pulse
                                      border border-nu-green-50"
              />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div
            className="bg-white rounded-2xl p-12 text-center shadow-sm
                          border border-nu-green-100"
          >
            <div className="text-5xl mb-4">📭</div>
            <p className="font-semibold text-nu-green-700">
              Belum ada transaksi
            </p>
            <p className="text-nu-green-400 text-sm mt-1 mb-5">
              Belum ada setoran yang dicatat
            </p>
            <Link
              href="/scan"
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              📲 Mulai Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((t) => (
              <TransaksiCard key={t.id} t={t} onBatalkan={handleBatalkan} />
            ))}
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div
            className="flex items-center justify-between bg-white rounded-2xl
                          p-4 border border-nu-green-100"
          >
            <button
              onClick={() => fetchTransaksi(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 rounded-xl border border-nu-green-200
                         text-nu-green-600 text-sm font-medium
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-nu-green-50 transition-colors"
            >
              ← Sebelumnya
            </button>
            <span className="text-nu-green-500 text-sm font-medium">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchTransaksi(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 rounded-xl border border-nu-green-200
                         text-nu-green-600 text-sm font-medium
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-nu-green-50 transition-colors"
            >
              Berikutnya →
            </button>
          </div>
        )}

        {/* ── FAB: Tombol scan mengambang ────────────────── */}
        <Link
          href="/scan"
          className="fixed bottom-6 right-4 w-16 h-16 bg-nu-green-600
                     hover:bg-nu-green-700 text-white rounded-full shadow-nu-lg
                     flex items-center justify-center text-3xl
                     transition-all active:scale-95 z-30
                     ring-4 ring-nu-green-200"
          title="Scan QR"
        >
          📲
        </Link>
      </main>
    </div>
  );
}
