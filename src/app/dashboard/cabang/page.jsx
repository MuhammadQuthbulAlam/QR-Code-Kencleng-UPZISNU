"use client";
// ============================================================
// src/app/dashboard/cabang/page.jsx
// Halaman Manajemen Cabang NU
//
// Fitur:
// - Tabel semua cabang dengan badge tingkatan
// - Modal form tambah/edit
// - Toggle aktif/nonaktif
// - Filter daerah & tingkat
// - View tree hierarki
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const TINGKAT_CFG = {
  WILAYAH: {
    label: "PWNU",
    bg: "bg-purple-100",
    text: "text-purple-700",
    icon: "🏛️",
  },
  CABANG: {
    label: "PCNU",
    bg: "bg-nu-green-100",
    text: "text-nu-green-700",
    icon: "🕌",
  },
  MWC: { label: "MWC", bg: "bg-blue-100", text: "text-blue-700", icon: "🏘️" },
};

function TingkatBadge({ tingkat }) {
  const cfg = TINGKAT_CFG[tingkat] ?? {
    label: tingkat,
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "📍",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatusDot({ isActive }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium
      ${isActive ? "text-emerald-600" : "text-gray-400"}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: Form Tambah / Edit Cabang
// ─────────────────────────────────────────────────────────────
function CabangModal({ cabang, parentList, onClose, onSave }) {
  const isEdit = !!cabang?.id;
  const [form, setForm] = useState({
    kode: cabang?.kode ?? "",
    nama: cabang?.nama ?? "",
    daerah: cabang?.daerah ?? "",
    tingkat: cabang?.tingkat ?? "CABANG",
    alamat: cabang?.alamat ?? "",
    telepon: cabang?.telepon ?? "",
    email: cabang?.email ?? "",
    ketua: cabang?.ketua ?? "",
    parentId: cabang?.parentId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  };

  // Auto-generate kode saat nama diisi
  const autoKode = () => {
    if (!form.kode && form.nama) {
      const prefix = { WILAYAH: "PWNU", CABANG: "PCNU", MWC: "MWC" }[
        form.tingkat
      ];
      const slug = form.nama
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 20);
      set("kode", `${prefix}-${slug}`);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});
    try {
      const url = isEdit ? `/api/cabang/${cabang.id}` : "/api/cabang";
      const method = isEdit ? "PUT" : "POST";
      const body = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "" && v !== null),
      );

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        // Tampilkan error validasi
        if (json.errors) {
          const errMap = {};
          json.errors.forEach((e) => {
            errMap[e.field] = e.message;
          });
          setErrors(errMap);
        } else {
          setErrors({ _global: json.message });
        }
        return;
      }

      onSave(json.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                    flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up my-4">
        {/* Header */}
        <div className="bg-nu-green-600 text-white rounded-t-2xl p-5 flex justify-between">
          <div>
            <h3 className="font-bold text-lg">
              {isEdit ? "Edit Cabang" : "Tambah Cabang Baru"}
            </h3>
            <p className="text-nu-green-200 text-xs mt-0.5">
              Struktur organisasi Nahdlatul Ulama
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-nu-green-200 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {errors._global && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              ⚠️ {errors._global}
            </div>
          )}

          {/* Tingkat */}
          <div>
            <label className="form-label">Tingkatan</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TINGKAT_CFG).map(([val, cfg]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("tingkat", val)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                    ${
                      form.tingkat === val
                        ? "bg-nu-green-600 text-white border-nu-green-600"
                        : "bg-white text-nu-green-600 border-nu-green-200 hover:border-nu-green-400"
                    }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nama */}
          <div>
            <label className="form-label">Nama Cabang *</label>
            <input
              value={form.nama}
              onChange={(e) => set("nama", e.target.value)}
              onBlur={autoKode}
              placeholder={`Contoh: Kota Surabaya`}
              className={`input-field ${errors.nama ? "border-red-400" : ""}`}
            />
            {errors.nama && (
              <p className="text-red-500 text-xs mt-1">{errors.nama}</p>
            )}
          </div>

          {/* Kode */}
          <div>
            <label className="form-label">Kode Unik *</label>
            <input
              value={form.kode}
              onChange={(e) => set("kode", e.target.value.toUpperCase())}
              placeholder="PCNU-KOTA-SURABAYA"
              className={`input-field font-mono ${errors.kode ? "border-red-400" : ""}`}
            />
            <p className="text-xs text-nu-green-400 mt-1">
              Hanya huruf kapital, angka, dan tanda hubung
            </p>
            {errors.kode && (
              <p className="text-red-500 text-xs">{errors.kode}</p>
            )}
          </div>

          {/* Daerah */}
          <div>
            <label className="form-label">Daerah / Provinsi *</label>
            <input
              value={form.daerah}
              onChange={(e) => set("daerah", e.target.value)}
              placeholder="Jawa Timur"
              className={`input-field ${errors.daerah ? "border-red-400" : ""}`}
            />
            {errors.daerah && (
              <p className="text-red-500 text-xs mt-1">{errors.daerah}</p>
            )}
          </div>

          {/* Parent */}
          {parentList?.length > 0 && (
            <div>
              <label className="form-label">Cabang Induk (opsional)</label>
              <select
                value={form.parentId}
                onChange={(e) => set("parentId", e.target.value)}
                className="input-field"
              >
                <option value="">— Tidak ada (cabang utama) —</option>
                {parentList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.tingkatLabel} {p.nama} — {p.daerah}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid 2 kolom: ketua & telepon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Nama Ketua</label>
              <input
                value={form.ketua}
                onChange={(e) => set("ketua", e.target.value)}
                placeholder="KH. Ahmad..."
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="form-label">Telepon</label>
              <input
                value={form.telepon}
                onChange={(e) => set("telepon", e.target.value)}
                placeholder="08xx-xxxx-xxxx"
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              type="email"
              placeholder="pcnu@example.or.id"
              className="input-field text-sm"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Alamat */}
          <div>
            <label className="form-label">Alamat Sekretariat</label>
            <textarea
              value={form.alamat}
              onChange={(e) => set("alamat", e.target.value)}
              rows={2}
              placeholder="Jl. ..."
              className="input-field text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-nu-green-100 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-2 flex-1 btn-primary py-2.5 disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : isEdit
                ? "Simpan Perubahan"
                : "Tambah Cabang"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: Tree Node (tampilan hierarki)
// ─────────────────────────────────────────────────────────────
function TreeNode({ node, depth = 0, onEdit, onToggle }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children?.length > 0;

  return (
    <div
      className={depth > 0 ? "ml-6 border-l-2 border-nu-green-100 pl-4" : ""}
    >
      <div className="flex items-center gap-3 py-2.5 hover:bg-nu-green-50/50 rounded-xl px-2 group">
        {/* Toggle expand */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-6 h-6 flex items-center justify-center text-xs text-nu-green-400
                      flex-shrink-0 ${!hasChildren && "invisible"}`}
        >
          {open ? "▼" : "▶"}
        </button>

        {/* Icon tingkat */}
        <span className="text-xl flex-shrink-0">
          {TINGKAT_CFG[node.tingkat]?.icon ?? "📍"}
        </span>

        {/* Info cabang */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-nu-green-900 text-sm">
              {node.namaLengkap ?? node.nama}
            </span>
            <TingkatBadge tingkat={node.tingkat} />
            {!node.isActive && (
              <span className="text-xs text-gray-400">• Nonaktif</span>
            )}
          </div>
          <p className="text-xs text-nu-green-400">
            {node.daerah} · {node.jumlahWarga ?? 0} warga
          </p>
        </div>

        {/* Aksi */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs"
          >
            ✏️
          </button>
          <button
            onClick={() => onToggle(node.id)}
            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs"
          >
            {node.isActive ? "⏸️" : "▶️"}
          </button>
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HALAMAN UTAMA
// ─────────────────────────────────────────────────────────────
export default function CabangPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [viewMode, setViewMode] = useState("table"); // "table" | "tree"
  const [treeData, setTreeData] = useState([]);
  const [daerahList, setDaerahList] = useState([]);
  const [modal, setModal] = useState(null); // null | { cabang? }
  const [filters, setFilters] = useState({
    search: "",
    daerah: "",
    tingkat: "",
    active: "",
  });
  const [delConfirm, setDelConfirm] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const toast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── Fetch list ──────────────────────────────────────────────
  const fetchList = useCallback(
    async (page = 1, ovr) => {
      setLoading(true);
      const f = ovr ?? filters;
      try {
        const qs = new URLSearchParams({
          page,
          limit: 20,
          ...(f.search && { search: f.search }),
          ...(f.daerah && { daerah: f.daerah }),
          ...(f.tingkat && { tingkat: f.tingkat }),
          ...(f.active && { active: f.active }),
        }).toString();
        const res = await fetch(`/api/cabang?${qs}`);
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

  // ── Fetch tree ──────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cabang?tree=true");
      const json = await res.json();
      if (json.success) setTreeData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch daerah dropdown ───────────────────────────────────
  const fetchDaerah = useCallback(async () => {
    const res = await fetch("/api/cabang?limit=200");
    const json = await res.json();
    if (json.success) {
      const unique = [...new Set(json.data.map((c) => c.daerah))].sort();
      setDaerahList(unique);
    }
  }, []);

  useEffect(() => {
    fetchList(1);
    fetchDaerah();
  }, []);

  useEffect(() => {
    if (viewMode === "tree") fetchTree();
  }, [viewMode]);

  // ── Filter change ───────────────────────────────────────────
  const handleFilterChange = (k, v) => {
    const next = { ...filters, [k]: v };
    setFilters(next);
    fetchList(1, next);
  };

  // ── Toggle aktif ────────────────────────────────────────────
  const handleToggle = async (id) => {
    const res = await fetch(`/api/cabang/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    const json = await res.json();
    if (json.success) {
      toast(json.message);
      fetchList(pagination.page);
      if (viewMode === "tree") fetchTree();
    }
  };

  // ── Hapus ────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const res = await fetch(`/api/cabang/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast("Cabang berhasil dihapus");
      fetchList(1);
    } else {
      toast(json.message, "error");
    }
    setDelConfirm(null);
  };

  // ── Save dari modal ──────────────────────────────────────────
  const handleSave = (saved) => {
    toast(
      `Cabang "${saved.nama}" berhasil ${modal?.cabang?.id ? "diperbarui" : "ditambahkan"}`,
    );
    setModal(null);
    fetchList(pagination.page);
    fetchDaerah();
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-nu-cream-50">
      {/* ── Toast ─────────────────────────────────────────── */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-2xl shadow-xl
          text-sm font-semibold animate-slide-up max-w-sm
          ${
            toastMsg.type === "error"
              ? "bg-red-600 text-white"
              : "bg-nu-green-600 text-white"
          }`}
        >
          {toastMsg.type === "error" ? "❌" : "✅"} {toastMsg.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="bg-nu-green-600 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-nu-green-200 hover:text-white text-sm"
            >
              ← Dashboard
            </Link>
            <div className="w-px h-5 bg-white/20" />
            <div>
              <h1 className="font-bold text-xl font-display">
                Manajemen Cabang
              </h1>
              <p className="text-nu-green-200 text-xs mt-0.5">
                PWNU · PCNU · MWC Nahdlatul Ulama
              </p>
            </div>
          </div>
          <button
            onClick={() => setModal({})}
            className="btn-gold text-sm flex items-center gap-2"
          >
            ＋ Tambah Cabang
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── KPI ringkasan ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Cabang",
              value: pagination.total || list.length,
              icon: "🏛️",
            },
            {
              label: "Cabang Aktif",
              value: list.filter((c) => c.isActive).length,
              icon: "✅",
            },
            { label: "Daerah", value: daerahList.length, icon: "🗺️" },
            {
              label: "Total Warga",
              value: list.reduce((s, c) => s + (c.jumlahWarga || 0), 0),
              icon: "👥",
            },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-nu-green-800">
                {loading ? "—" : s.value.toLocaleString("id-ID")}
              </div>
              <div className="text-xs text-nu-green-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          {/* Baris 1: search + filter */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="🔍 Cari nama, kode, atau daerah..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="input-field flex-1 min-w-48 text-sm py-2"
            />

            <select
              value={filters.daerah}
              onChange={(e) => handleFilterChange("daerah", e.target.value)}
              className="input-field text-sm py-2 w-44"
            >
              <option value="">Semua Daerah</option>
              {daerahList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filters.tingkat}
              onChange={(e) => handleFilterChange("tingkat", e.target.value)}
              className="input-field text-sm py-2 w-32"
            >
              <option value="">Semua Tingkat</option>
              <option value="WILAYAH">🏛️ PWNU</option>
              <option value="CABANG">🕌 PCNU</option>
              <option value="MWC">🏘️ MWC</option>
            </select>

            <select
              value={filters.active}
              onChange={(e) => handleFilterChange("active", e.target.value)}
              className="input-field text-sm py-2 w-32"
            >
              <option value="">Semua Status</option>
              <option value="true">✅ Aktif</option>
              <option value="false">⏸️ Nonaktif</option>
            </select>
          </div>

          {/* Baris 2: view toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-nu-green-500 font-medium">
              Tampilan:
            </span>
            {[
              { key: "table", icon: "📋", label: "Tabel" },
              { key: "tree", icon: "🌳", label: "Hierarki" },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                  ${
                    viewMode === v.key
                      ? "bg-nu-green-600 text-white border-nu-green-600"
                      : "bg-white text-nu-green-600 border-nu-green-200 hover:border-nu-green-400"
                  }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ VIEW: TABEL ══════════════════════════════════════ */}
        {viewMode === "table" && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-nu-green-50 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-5xl mb-4">🏛️</div>
                <p className="font-semibold text-nu-green-700">
                  Belum ada data cabang
                </p>
                <p className="text-nu-green-400 text-sm mt-1 mb-5">
                  Tambah cabang pertama untuk memulai
                </p>
                <button
                  onClick={() => setModal({})}
                  className="btn-primary text-sm"
                >
                  ＋ Tambah Cabang
                </button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-nu-green-600 text-white">
                        {[
                          "Kode",
                          "Cabang",
                          "Daerah",
                          "Tingkat",
                          "Ketua",
                          "Warga",
                          "Status",
                          "Aksi",
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
                      {list.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-t border-nu-green-50 transition-colors
                            ${i % 2 === 0 ? "bg-white" : "bg-nu-green-50/30"}
                            hover:bg-nu-green-50`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-nu-green-500">
                            {c.kode}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-nu-green-900">
                              {c.nama}
                            </p>
                            {c.email && (
                              <p className="text-xs text-nu-green-400">
                                {c.email}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-nu-green-600">
                            {c.daerah}
                          </td>
                          <td className="px-4 py-3">
                            <TingkatBadge tingkat={c.tingkat} />
                          </td>
                          <td className="px-4 py-3 text-nu-green-600 text-xs">
                            {c.ketua || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-nu-green-800">
                              {(c.jumlahWarga ?? 0).toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusDot isActive={c.isActive} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setModal({ cabang: c })}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600
                                           hover:bg-blue-100 transition-colors"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleToggle(c.id)}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-600
                                           hover:bg-amber-100 transition-colors"
                                title={c.isActive ? "Nonaktifkan" : "Aktifkan"}
                              >
                                {c.isActive ? "⏸️" : "▶️"}
                              </button>
                              <button
                                onClick={() => setDelConfirm(c)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600
                                           hover:bg-red-100 transition-colors"
                                title="Hapus"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-nu-green-50">
                  {list.map((c) => (
                    <div key={c.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {TINGKAT_CFG[c.tingkat]?.icon ?? "📍"}
                          </span>
                          <div>
                            <p className="font-semibold text-nu-green-900 text-sm">
                              {c.nama}
                            </p>
                            <p className="text-xs text-nu-green-400">
                              {c.daerah}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setModal({ cabang: c })}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggle(c.id)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs"
                          >
                            {c.isActive ? "⏸️" : "▶️"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <TingkatBadge tingkat={c.tingkat} />
                        <StatusDot isActive={c.isActive} />
                        <span className="text-xs text-nu-green-400">
                          {c.jumlahWarga ?? 0} warga
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-nu-green-50">
                    <button
                      onClick={() => fetchList(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-4 py-2 rounded-xl border border-nu-green-200 text-nu-green-600 text-sm
                                 disabled:opacity-30 hover:bg-nu-green-50"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="text-nu-green-500 text-sm font-medium">
                      {pagination.page} / {pagination.totalPages} (
                      {pagination.total} cabang)
                    </span>
                    <button
                      onClick={() => fetchList(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-4 py-2 rounded-xl border border-nu-green-200 text-nu-green-600 text-sm
                                 disabled:opacity-30 hover:bg-nu-green-50"
                    >
                      Berikutnya →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ VIEW: TREE HIERARKI ═══════════════════════════════ */}
        {viewMode === "tree" && (
          <div className="card p-5">
            <h3 className="font-bold text-nu-green-900 mb-4 flex items-center gap-2">
              🌳 Hierarki Cabang NU
              <span className="text-xs font-normal text-nu-green-400">
                (klik ▶ untuk expand)
              </span>
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-nu-green-50 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : treeData.length === 0 ? (
              <p className="text-nu-green-400 text-sm text-center py-8">
                Belum ada data cabang
              </p>
            ) : (
              <div className="space-y-1">
                {treeData.map((root) => (
                  <TreeNode
                    key={root.id}
                    node={root}
                    depth={0}
                    onEdit={(c) => setModal({ cabang: c })}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal Form ──────────────────────────────────────── */}
      {modal !== null && (
        <CabangModal
          cabang={modal.cabang}
          parentList={list.filter((c) => c.tingkat !== "MWC" && c.isActive)}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Konfirmasi Hapus ─────────────────────────────────── */}
      {delConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center animate-slide-up">
            <div className="text-5xl mb-3">⚠️</div>
            <h3 className="font-bold text-nu-green-900 text-lg mb-2">
              Hapus Cabang?
            </h3>
            <p className="text-nu-green-600 text-sm mb-5">
              Cabang <strong>"{delConfirm.nama}"</strong> akan dihapus permanen.
              Pastikan tidak ada warga atau sub-cabang terdaftar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDelConfirm(null)}
                className="flex-1 btn-secondary py-2.5"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(delConfirm.id)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
