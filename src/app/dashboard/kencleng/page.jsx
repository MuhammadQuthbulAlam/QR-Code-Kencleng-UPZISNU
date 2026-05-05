// ============================================================
// src/app/dashboard/kencleng/page.jsx
// Halaman Dashboard Manajemen Data Warga Kencleng
//
// Fitur:
// - Tabel data warga dengan search + filter ranting
// - Tombol import Excel (modal upload)
// - Tombol tambah warga manual
// - Tampilan QR Code di modal detail
// - Export ke Excel
// ============================================================

"use client";

import { useState, useCallback, useRef } from "react";

// ── Komponen kecil: Badge status aktif ──────────────────────
function StatusBadge({ isActive }) {
  return (
    <span
      className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
      ${
        isActive
          ? "bg-nu-green-100 text-nu-green-700"
          : "bg-gray-100 text-gray-500"
      }
    `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-nu-green-500" : "bg-gray-400"}`}
      />
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  );
}

// ── Komponen: Modal QR Code ──────────────────────────────────
function QrModal({ warga, onClose }) {
  if (!warga) return null;

  return (
    // Overlay gelap di belakang modal
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose} // Klik di luar modal = tutup
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()} // Klik di dalam modal = jangan tutup
      >
        {/* Header modal */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 bg-nu-green-600 rounded-full flex items-center
                          justify-center text-white text-2xl mx-auto mb-3"
          >
            ☪️
          </div>
          <h3 className="font-bold text-nu-green-900 text-lg">
            QR Code Kencleng
          </h3>
          <p className="text-nu-green-600 font-mono font-semibold">
            {warga.qr_code}
          </p>
        </div>

        {/* Gambar QR Code */}
        {warga.qr_image ? (
          <div className="border-4 border-nu-green-200 rounded-xl p-3 mb-4 bg-white">
            <img
              src={warga.qr_image}
              alt={`QR Code ${warga.qr_code}`}
              className="w-full"
            />
          </div>
        ) : (
          <div
            className="bg-nu-green-50 border-2 border-dashed border-nu-green-300
                          rounded-xl p-8 text-center mb-4"
          >
            <p className="text-nu-green-400 text-sm">QR Image tidak tersedia</p>
          </div>
        )}

        {/* Info warga */}
        <div className="space-y-2 text-sm bg-nu-green-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between">
            <span className="text-nu-green-500 font-medium">No. Kencleng</span>
            <span className="font-bold text-nu-green-800">
              {warga.no_kencleng}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-nu-green-500 font-medium">Nama</span>
            <span className="font-semibold text-nu-green-800">
              {warga.nama}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-nu-green-500 font-medium">Ranting</span>
            <span className="text-nu-green-700">{warga.ranting}</span>
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 btn-secondary text-sm py-2"
          >
            🖨️ Cetak
          </button>
          <button onClick={onClose} className="flex-1 btn-primary text-sm py-2">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Komponen: Modal Import Excel ─────────────────────────────
function ImportModal({ onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file); // Field name harus "file" (sesuai API)

      const res = await fetch("/api/kencleng/import", {
        method: "POST",
        body: formData,
        // JANGAN set Content-Type header — biarkan browser set multipart boundary
      });
      const json = await res.json();
      setResult(json);
      if (json.result?.created > 0) onSuccess?.();
    } catch (err) {
      setResult({
        success: false,
        message: "Gagal menghubungi server: " + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-nu-green-900 text-lg mb-1">
          Import Data Warga
        </h3>
        <p className="text-nu-green-500 text-sm mb-6">
          Upload file Excel (.xlsx) berisi data warga kencleng
        </p>

        {/* Area drag & drop */}
        {!result && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all mb-4
              ${
                dragOver
                  ? "border-nu-green-500 bg-nu-green-50"
                  : "border-nu-green-200 hover:border-nu-green-400 hover:bg-nu-green-50/50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="text-4xl mb-3">{file ? "📊" : "📂"}</div>
            {file ? (
              <>
                <p className="font-semibold text-nu-green-800">{file.name}</p>
                <p className="text-xs text-nu-green-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB — klik untuk ganti file
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-nu-green-700">
                  Drag & drop file Excel di sini
                </p>
                <p className="text-xs text-nu-green-400 mt-1">
                  atau klik untuk pilih file (.xlsx, .xls)
                </p>
              </>
            )}
          </div>
        )}

        {/* Hasil import */}
        {result && (
          <div
            className={`rounded-xl p-4 mb-4 text-sm ${
              result.success
                ? "bg-nu-green-50 border border-nu-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p className="font-bold mb-2">{result.message}</p>
            {result.result && (
              <div className="space-y-1 text-xs">
                <p>
                  ✅ Berhasil disimpan: <strong>{result.result.created}</strong>
                </p>
                <p>
                  ⏭️ Di-skip (duplikat):{" "}
                  <strong>{result.result.skipped}</strong>
                </p>
                {result.result.failed > 0 && (
                  <p>
                    ❌ Gagal: <strong>{result.result.failed}</strong>
                  </p>
                )}
              </div>
            )}
            {result.result?.errors?.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                {result.result.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-red-600 text-xs">
                    Baris {e.row}: [{e.field}] {e.message}
                  </p>
                ))}
                {result.result.errors.length > 5 && (
                  <p className="text-gray-500 text-xs">
                    ...dan {result.result.errors.length - 5} error lainnya
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {/* Download template */}
          <a
            href="/api/kencleng/import"
            download
            className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-1"
          >
            📥 Template
          </a>

          <div className="flex-1 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary text-sm py-2"
            >
              {result ? "Selesai" : "Batal"}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 btn-primary text-sm py-2 disabled:opacity-50"
              >
                {loading ? "Mengimport..." : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Halaman Utama ────────────────────────────────────────────
export default function KenclengPage() {
  const [wargaList, setWargaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedWarga, setSelectedWarga] = useState(null); // Untuk modal QR
  const [showImport, setShowImport] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  // Fetch data warga dari API
  const fetchWarga = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: 1,
        limit: 20,
        ...params,
      }).toString();
      const res = await fetch(`/api/kencleng?${qs}`);
      const json = await res.json();
      if (json.success) {
        setWargaList(json.data);
        setPagination({ page: json.page, totalPages: json.totalPages });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch QR image detail lalu tampilkan modal
  const handleShowQr = async (wargaId) => {
    const res = await fetch(`/api/kencleng/${wargaId}`);
    const json = await res.json();
    if (json.success) setSelectedWarga(json.data);
  };

  return (
    <div className="min-h-screen bg-islamic-pattern">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="bg-nu-header text-white">
        <div className="section-container py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display">
                Data Warga Kencleng
              </h1>
              <p className="text-nu-green-200 text-sm mt-1">
                Manajemen data & QR Code kencleng UPZ Nahdlatul Ulama
              </p>
            </div>
            {/* Tombol aksi header */}
            <div className="flex gap-3 flex-wrap">
              <a
                href="/api/kencleng/export"
                className="btn-secondary bg-white/10 border-white/30 text-white
                           hover:bg-white/20 text-sm"
              >
                📊 Export Excel
              </a>
              <button
                onClick={() => setShowImport(true)}
                className="btn-gold text-sm"
              >
                📥 Import Excel
              </button>
              <button
                onClick={() => {
                  /* TODO: buka form tambah */
                }}
                className="btn-primary bg-white text-nu-green-700 hover:bg-nu-green-50 text-sm"
              >
                ＋ Tambah Warga
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-container py-6 space-y-6">
        {/* ── Stat Cards ───────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Warga", value: stats.total, icon: "👥" },
            { label: "Warga Aktif", value: stats.active, icon: "✅" },
            { label: "Total Ranting", value: "-", icon: "🕌" },
            { label: "QR Terdaftar", value: stats.total, icon: "📲" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-nu-green-800">
                {s.value}
              </div>
              <div className="text-xs text-nu-green-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Search Bar ───────────────────────────────── */}
        <div className="card p-4 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Cari nama, no. kencleng, atau ranting..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchWarga({ search })}
            className="input-field flex-1 min-w-48"
          />
          <button
            onClick={() => fetchWarga({ search })}
            className="btn-primary text-sm px-6"
          >
            🔍 Cari
          </button>
          <button
            onClick={() => {
              setSearch("");
              fetchWarga();
            }}
            className="btn-secondary text-sm"
          >
            Reset
          </button>
        </div>

        {/* ── Tabel Data Warga ─────────────────────────── */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div
                className="w-8 h-8 border-3 border-nu-green-600 border-t-transparent
                              rounded-full animate-spin mx-auto mb-3"
              />
              <p className="text-nu-green-500 text-sm">Memuat data...</p>
            </div>
          ) : wargaList.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-semibold text-nu-green-700">
                Belum ada data warga
              </p>
              <p className="text-nu-green-400 text-sm mt-1">
                Tambah manual atau import dari file Excel
              </p>
              <button
                onClick={() => fetchWarga()}
                className="btn-primary text-sm mt-4"
              >
                Muat Data
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-nu-green-600 text-white">
                    {[
                      "No",
                      "No Kencleng",
                      "QR Code",
                      "Nama",
                      "Ranting",
                      "Alamat",
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
                  {wargaList.map((w, i) => (
                    <tr
                      key={w.id}
                      className="border-b border-nu-green-50 hover:bg-nu-green-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-nu-green-400 text-xs">
                        {(pagination.page - 1) * 20 + i + 1}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-nu-green-800">
                        {w.no_kencleng}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge font-mono">{w.qr_code}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-nu-green-900">
                        {w.nama}
                      </td>
                      <td className="px-4 py-3 text-nu-green-600">
                        {w.ranting}
                      </td>
                      <td
                        className="px-4 py-3 text-nu-green-500 max-w-48 truncate"
                        title={w.alamat}
                      >
                        {w.alamat}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isActive={w.isActive} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {/* Tombol lihat QR */}
                          <button
                            onClick={() => handleShowQr(w.id)}
                            title="Lihat QR Code"
                            className="p-1.5 rounded-lg bg-nu-green-100 text-nu-green-700
                                       hover:bg-nu-green-600 hover:text-white transition-all"
                          >
                            📲
                          </button>
                          {/* Tombol edit */}
                          <button
                            title="Edit"
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-700
                                       hover:bg-blue-600 hover:text-white transition-all"
                          >
                            ✏️
                          </button>
                          {/* Tombol hapus */}
                          <button
                            title="Hapus"
                            onClick={async () => {
                              if (!confirm(`Hapus warga "${w.nama}"?`)) return;
                              await fetch(`/api/kencleng/${w.id}`, {
                                method: "DELETE",
                              });
                              fetchWarga();
                            }}
                            className="p-1.5 rounded-lg bg-red-100 text-red-700
                                       hover:bg-red-600 hover:text-white transition-all"
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
          )}
        </div>

        {/* ── Panduan Format Excel ──────────────────────── */}
        <div className="card p-5 border-l-4 border-nu-gold-500">
          <h3 className="font-semibold text-nu-green-800 mb-2">
            📋 Format Import Excel
          </h3>
          <p className="text-sm text-nu-green-600 mb-3">
            File Excel harus memiliki kolom berikut (baris pertama = header):
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full max-w-lg">
              <thead>
                <tr className="bg-nu-green-50">
                  {["Kolom", "Nama Header", "Wajib", "Contoh"].map((h) => (
                    <th
                      key={h}
                      className="border border-nu-green-200 px-3 py-2 text-left
                                           font-semibold text-nu-green-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["A", "no_kencleng", "✅", "0001"],
                  ["B", "nama", "✅", "Ahmad Fauzi"],
                  ["C", "ranting", "✅", "Ranting Kauman"],
                  ["D", "alamat", "✅", "Jl. Masjid No. 1"],
                ].map(([col, name, req, ex]) => (
                  <tr key={col} className="hover:bg-nu-green-50/50">
                    <td
                      className="border border-nu-green-200 px-3 py-2 font-mono font-bold
                                   text-nu-green-600"
                    >
                      {col}
                    </td>
                    <td className="border border-nu-green-200 px-3 py-2 font-mono">
                      {name}
                    </td>
                    <td className="border border-nu-green-200 px-3 py-2 text-center">
                      {req}
                    </td>
                    <td className="border border-nu-green-200 px-3 py-2 text-nu-green-500">
                      {ex}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-nu-green-400 mt-2">
            💡 QR Code (format UPZ-XXXX) akan di-generate otomatis saat import.
          </p>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {selectedWarga && (
        <QrModal warga={selectedWarga} onClose={() => setSelectedWarga(null)} />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            fetchWarga();
          }}
        />
      )}
    </div>
  );
}
