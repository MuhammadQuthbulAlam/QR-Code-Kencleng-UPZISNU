"use client";
// ============================================================
// src/app/scan/page.jsx
// Halaman Scan QR Kencleng — Mobile-First
//
// Alur:
//   IDLE → [scan QR] → SCANNING → [QR terdeteksi] →
//   LOOKUP (ambil data warga) → FORM (input nominal) →
//   SAVING → SUCCESS → [scan lagi / lihat riwayat]
//
// Library: html5-qrcode (npm install html5-qrcode)
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ── Konstanta nominal cepat (quick-tap) ──────────────────────
// Petugas bisa tap nominal umum tanpa mengetik manual
const QUICK_NOMINALS = [
  { label: "5K", value: 5_000 },
  { label: "10K", value: 10_000 },
  { label: "20K", value: 20_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
];

// ── Format Rupiah ─────────────────────────────────────────────
function formatRp(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// ── Parse input nominal (bersihkan titik/koma) ────────────────
function parseNominal(str) {
  return parseInt(String(str).replace(/\D/g, ""), 10) || 0;
}

// ── Fase halaman ──────────────────────────────────────────────
const PHASE = {
  IDLE: "idle", // Belum mulai scan
  SCANNING: "scanning", // Kamera aktif, menunggu QR
  LOOKUP: "lookup", // Cari data warga di server
  FORM: "form", // Input nominal
  SAVING: "saving", // Simpan transaksi ke server
  SUCCESS: "success", // Transaksi berhasil
  ERROR: "error", // Error fatal
};

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: Tampilan header status / progress
// ─────────────────────────────────────────────────────────────
function PhaseBar({ phase }) {
  const steps = [
    { key: PHASE.SCANNING, label: "Scan" },
    { key: PHASE.FORM, label: "Input" },
    { key: PHASE.SUCCESS, label: "Selesai" },
  ];

  const activeIdx = steps.findIndex((s) => s.key === phase);

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((step, i) => {
        const done = i < activeIdx || phase === PHASE.SUCCESS;
        const current = i === activeIdx && phase !== PHASE.SUCCESS;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              transition-all duration-300
              ${done ? "bg-nu-green-600 text-white" : ""}
              ${current ? "bg-nu-green-600 text-white ring-4 ring-nu-green-200" : ""}
              ${!done && !current ? "bg-nu-green-100 text-nu-green-400" : ""}
            `}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                current ? "text-nu-green-700" : "text-nu-green-400"
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${done ? "bg-nu-green-500" : "bg-nu-green-100"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: Viewfinder kamera + overlay animasi scan
// ─────────────────────────────────────────────────────────────
function ScannerViewfinder({ containerId }) {
  return (
    <div className="relative w-full max-w-xs mx-auto aspect-square">
      {/* Container QR scanner — html5-qrcode akan inject video ke sini */}
      <div
        id={containerId}
        className="w-full h-full rounded-2xl overflow-hidden bg-black"
      />

      {/* Overlay: empat sudut frame berwarna hijau NU */}
      {[
        "top-0 left-0",
        "top-0 right-0 rotate-90",
        "bottom-0 right-0 rotate-180",
        "bottom-0 left-0 -rotate-90",
      ].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-8 h-8 pointer-events-none`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-nu-green-400 rounded" />
          <div className="absolute top-0 left-0 w-1 h-full bg-nu-green-400 rounded" />
        </div>
      ))}

      {/* Garis scan animasi */}
      <div
        className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent
                   via-nu-green-400 to-transparent rounded-full pointer-events-none
                   animate-[scan_2s_ease-in-out_infinite]"
        style={{ top: "50%" }}
      />

      {/* Style animasi scan */}
      <style>{`
        @keyframes scan {
          0%   { transform: translateY(-60px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(60px);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: Card info warga hasil scan
// ─────────────────────────────────────────────────────────────
function WargaCard({ warga }) {
  return (
    <div
      className="bg-gradient-to-br from-nu-green-600 to-nu-green-800
                    rounded-2xl p-5 text-white shadow-nu-lg"
    >
      {/* Badge QR code */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="bg-white/20 text-white text-xs font-mono font-bold
                         px-3 py-1 rounded-full backdrop-blur-sm"
        >
          {warga.qr_code}
        </span>
        <span
          className="bg-nu-gold-500 text-white text-xs font-bold
                         px-2 py-1 rounded-full"
        >
          ✅ Terverifikasi
        </span>
      </div>

      {/* Nama warga (besar) */}
      <p className="font-display text-2xl font-bold leading-tight mb-1">
        {warga.nama}
      </p>

      {/* Detail */}
      <div className="space-y-1 mt-3">
        <div className="flex items-center gap-2 text-nu-green-100 text-sm">
          <span>🏠</span>
          <span>{warga.ranting}</span>
        </div>
        <div className="flex items-center gap-2 text-nu-green-100 text-sm">
          <span>📍</span>
          <span className="line-clamp-1">{warga.alamat}</span>
        </div>
        <div className="flex items-center gap-2 text-nu-green-100 text-sm">
          <span>🆔</span>
          <span className="font-mono">No. {warga.no_kencleng}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: Form input nominal
// ─────────────────────────────────────────────────────────────
function NominalForm({ warga, onSubmit, loading }) {
  const [nominal, setNominal] = useState("");
  const [metode, setMetode] = useState("TUNAI");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Auto-focus input saat form muncul
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const numericNominal = parseNominal(nominal);
  const isValid = numericNominal >= 500;

  const handleNominalChange = (e) => {
    // Hanya izinkan digit; format dengan titik ribuan
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw, 10) || 0;
    setNominal(num > 0 ? num.toLocaleString("id-ID") : "");
    setError("");
  };

  const handleQuickSelect = (value) => {
    setNominal(value.toLocaleString("id-ID"));
    setError("");
    inputRef.current?.blur();
  };

  const handleSubmit = () => {
    if (!isValid) {
      setError("Nominal minimal Rp 500");
      inputRef.current?.focus();
      return;
    }
    onSubmit({ nominal: numericNominal, metode, catatan });
  };

  return (
    <div className="space-y-5">
      {/* Nominal input */}
      <div>
        <label className="form-label text-base">💰 Nominal Setoran</label>

        {/* Tombol nominal cepat */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {QUICK_NOMINALS.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => handleQuickSelect(q.value)}
              className={`
                py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95
                ${
                  numericNominal === q.value
                    ? "bg-nu-green-600 text-white border-nu-green-600 shadow-nu"
                    : "bg-white text-nu-green-700 border-nu-green-200 hover:border-nu-green-400"
                }
              `}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Input manual */}
        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2
                           text-nu-green-500 font-bold text-lg select-none"
          >
            Rp
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric" // Keyboard angka di mobile
            pattern="[0-9]*"
            value={nominal}
            onChange={handleNominalChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="0"
            className={`
              input-field pl-12 text-right text-2xl font-bold tracking-wide
              ${error ? "border-red-400 ring-2 ring-red-200" : ""}
            `}
          />
        </div>

        {/* Preview nominal + error */}
        <div className="flex justify-between mt-1.5 px-1">
          {error ? (
            <p className="text-red-500 text-sm font-medium">⚠️ {error}</p>
          ) : (
            <p className="text-nu-green-400 text-sm">Minimal Rp 500</p>
          )}
          {numericNominal > 0 && (
            <p className="text-nu-green-600 text-sm font-semibold">
              = {formatRp(numericNominal)}
            </p>
          )}
        </div>
      </div>

      {/* Metode pembayaran */}
      <div>
        <label className="form-label">Metode Pembayaran</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "TUNAI", icon: "💵", label: "Tunai" },
            { value: "TRANSFER", icon: "📱", label: "Transfer" },
            { value: "LAINNYA", icon: "🔄", label: "Lainnya" },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetode(m.value)}
              className={`
                flex flex-col items-center gap-1 py-3 rounded-xl border-2
                text-sm font-medium transition-all active:scale-95
                ${
                  metode === m.value
                    ? "bg-nu-green-600 text-white border-nu-green-600"
                    : "bg-white text-nu-green-600 border-nu-green-200 hover:border-nu-green-400"
                }
              `}
            >
              <span className="text-xl">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catatan (opsional) */}
      <div>
        <label className="form-label">
          Catatan{" "}
          <span className="text-nu-green-400 font-normal">(opsional)</span>
        </label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          maxLength={255}
          rows={2}
          placeholder="Catatan tambahan untuk petugas..."
          className="input-field resize-none text-sm"
        />
      </div>

      {/* Tombol simpan */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !isValid}
        className={`
          w-full py-4 rounded-2xl font-bold text-lg transition-all
          active:scale-95 shadow-nu-lg
          ${
            isValid && !loading
              ? "bg-nu-green-600 text-white hover:bg-nu-green-700"
              : "bg-nu-green-100 text-nu-green-300 cursor-not-allowed"
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <span
              className="w-5 h-5 border-2 border-white border-t-transparent
                             rounded-full animate-spin"
            />
            Menyimpan...
          </span>
        ) : (
          `Simpan Setoran ${isValid ? formatRp(numericNominal) : ""}`
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-KOMPONEN: Layar sukses dengan konfeti sederhana
// ─────────────────────────────────────────────────────────────
function SuccessScreen({ transaksi, onScanLagi }) {
  return (
    <div className="text-center space-y-6 py-4 animate-slide-up">
      {/* Ikon sukses */}
      <div className="relative mx-auto w-28 h-28">
        <div
          className="w-28 h-28 bg-nu-green-100 rounded-full flex items-center
                        justify-center text-6xl animate-[bounceIn_0.5s_ease-out]"
        >
          ✅
        </div>
        {/* Lingkaran pulse */}
        <div
          className="absolute inset-0 rounded-full bg-nu-green-200
                        animate-ping opacity-30"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-nu-green-800 font-display">
          Setoran Berhasil!
        </h2>
        <p className="text-nu-green-500 mt-1 text-sm">
          Transaksi telah tersimpan
        </p>
      </div>

      {/* Kartu ringkasan transaksi */}
      <div className="bg-nu-green-50 border border-nu-green-200 rounded-2xl p-5 text-left space-y-3">
        <div
          className="flex justify-between items-center pb-3
                        border-b border-nu-green-200"
        >
          <span className="text-nu-green-500 text-sm">Total Setoran</span>
          <span className="text-2xl font-bold text-nu-green-800">
            {transaksi.nominalFormatted}
          </span>
        </div>
        {[
          { label: "Warga", value: transaksi.namaWarga },
          { label: "Ranting", value: transaksi.ranting },
          { label: "No. Kencleng", value: transaksi.noKencleng },
          { label: "QR Code", value: transaksi.qrCode, mono: true },
          { label: "Metode", value: transaksi.metodePembayaran },
          { label: "Periode", value: transaksi.periode },
          { label: "ID", value: transaksi.id.slice(-8), mono: true, dim: true },
        ].map(({ label, value, mono, dim }) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-nu-green-400 text-sm flex-shrink-0">
              {label}
            </span>
            <span
              className={`text-right text-sm font-medium
              ${mono ? "font-mono" : ""}
              ${dim ? "text-nu-green-300" : "text-nu-green-800"}
            `}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link
          href="/transaksi"
          className="flex-1 py-3.5 rounded-xl border-2 border-nu-green-600
                     text-nu-green-700 font-semibold text-center text-sm
                     hover:bg-nu-green-50 transition-colors"
        >
          📋 Riwayat
        </Link>
        <button
          onClick={onScanLagi}
          className="flex-2 flex-1 py-3.5 rounded-xl bg-nu-green-600 text-white
                     font-semibold text-sm hover:bg-nu-green-700 transition-colors
                     active:scale-95"
        >
          📲 Scan Lagi
        </button>
      </div>

      <style>{`
        @keyframes bounceIn {
          0%   { transform: scale(0.3); opacity: 0; }
          50%  { transform: scale(1.05); }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN UTAMA: ScanPage
// ─────────────────────────────────────────────────────────────
const SCANNER_ID = "nu-qr-scanner";

export default function ScanPage() {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [warga, setWarga] = useState(null); // Data warga dari server
  const [transaksi, setTransaksi] = useState(null); // Transaksi yang berhasil
  const [error, setError] = useState("");
  const [scanError, setScanError] = useState("");

  // Ref ke instance html5-qrcode agar bisa stop dari luar
  const scannerRef = useRef(null);

  // ── Cleanup scanner saat unmount ──────────────────────────
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // ── Stop scanner ──────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Abaikan error saat stop (kamera sudah nonaktif)
      }
      scannerRef.current = null;
    }
  }, []);

  // ── Mulai kamera scan ─────────────────────────────────────
  const startScanner = useCallback(async () => {
    setPhase(PHASE.SCANNING);
    setScanError("");

    try {
      // Lazy-load html5-qrcode agar tidak di-bundle untuk SSR
      const { Html5Qrcode } = await import("html5-qrcode");

      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        // Gunakan kamera belakang (facingMode: environment) di mobile
        { facingMode: "environment" },
        {
          fps: 10, // Frame per detik (cukup untuk QR)
          qrbox: 220, // Ukuran area scan (px)
          aspectRatio: 1.0, // Aspect ratio kamera 1:1
          disableFlip: false,
        },
        // ── Callback: QR berhasil di-decode ────────────────
        async (decodedText) => {
          // Langsung stop scanner setelah QR ditemukan
          await stopScanner();
          await lookupWarga(decodedText.trim());
        },
        // ── Callback: error saat decode (normal, diabaikan) ─
        () => {}, // Setiap frame yang gagal decode akan trigger ini — abaikan
      );
    } catch (err) {
      setPhase(PHASE.IDLE);
      if (err?.message?.includes("Permission")) {
        setScanError(
          "Izin kamera ditolak. Aktifkan kamera di pengaturan browser.",
        );
      } else if (err?.message?.includes("NotFound")) {
        setScanError("Kamera tidak ditemukan di perangkat ini.");
      } else {
        setScanError(
          "Gagal membuka kamera: " + (err?.message ?? "Unknown error"),
        );
      }
    }
  }, [stopScanner]);

  // ── Lookup data warga berdasarkan QR code ─────────────────
  const lookupWarga = useCallback(async (qrCode) => {
    setPhase(PHASE.LOOKUP);

    try {
      const res = await fetch(
        `/api/kencleng/qrcode?code=${encodeURIComponent(qrCode)}`,
      );
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "QR code tidak terdaftar");
      }

      if (!json.data.isActive) {
        throw new Error(`Warga "${json.data.nama}" sudah tidak aktif`);
      }

      setWarga(json.data);
      setPhase(PHASE.FORM);
    } catch (err) {
      setError(err.message || "Gagal mengambil data warga");
      setPhase(PHASE.ERROR);
    }
  }, []);

  // ── Simpan transaksi ──────────────────────────────────────
  const handleSimpan = useCallback(
    async ({ nominal, metode, catatan }) => {
      setPhase(PHASE.SAVING);

      try {
        const res = await fetch("/api/transaksi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wargaId: warga.id,
            nominal,
            metodePembayaran: metode,
            catatan: catatan || null,
            petugasNama: "Petugas", // Ganti dengan nama dari session
          }),
        });
        const json = await res.json();

        if (!json.success) {
          // Kembalikan ke form + tampilkan error dari server
          setPhase(PHASE.FORM);
          setError(json.message || "Gagal menyimpan transaksi");
          return;
        }

        setTransaksi(json.data);
        setPhase(PHASE.SUCCESS);
      } catch (err) {
        setPhase(PHASE.FORM);
        setError("Koneksi gagal. Coba lagi.");
      }
    },
    [warga],
  );

  // ── Reset ke awal (scan lagi) ─────────────────────────────
  const handleReset = useCallback(() => {
    setPhase(PHASE.IDLE);
    setWarga(null);
    setTransaksi(null);
    setError("");
    setScanError("");
  }, []);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-nu-green-950 via-nu-green-900 to-nu-green-800">
      {/* ── Header ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 bg-nu-green-950/90 backdrop-blur-md
                         border-b border-white/10"
      >
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <Link
            href="/dashboard"
            className="text-nu-green-300 hover:text-white transition-colors p-1"
          >
            ← Kembali
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-nu-gold-400 text-lg">☪️</span>
            <span className="text-white font-bold font-display text-lg">
              Scan Kencleng
            </span>
          </div>
          <Link
            href="/transaksi"
            className="text-nu-green-300 hover:text-white transition-colors text-xs p-1"
          >
            Riwayat
          </Link>
        </div>
      </header>

      {/* ── Konten Utama ────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pb-10">
        {/* Progress bar fase */}
        {phase !== PHASE.IDLE && phase !== PHASE.ERROR && (
          <div className="bg-white/5 rounded-2xl mt-4 px-2">
            <PhaseBar phase={phase} />
          </div>
        )}

        {/* ══════════ FASE: IDLE ══════════════════════════ */}
        {phase === PHASE.IDLE && (
          <div className="text-center pt-16 pb-8 space-y-8 animate-fade-in">
            {/* Logo besar */}
            <div className="relative mx-auto w-36 h-36">
              <div
                className="w-36 h-36 bg-nu-green-800/60 rounded-3xl border border-nu-green-600/40
                              flex items-center justify-center text-7xl backdrop-blur-sm"
              >
                📲
              </div>
              <div
                className="absolute -top-2 -right-2 w-8 h-8 bg-nu-gold-500 rounded-full
                              flex items-center justify-center text-sm animate-pulse"
              >
                NU
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white font-display">
                Scan QR Kencleng
              </h1>
              <p className="text-nu-green-300 mt-2 text-sm leading-relaxed">
                Arahkan kamera ke QR Code di kencleng
                <br />
                warga untuk mencatat setoran
              </p>
            </div>

            {scanError && (
              <div
                className="bg-red-900/50 border border-red-500/40 text-red-300
                              rounded-xl p-4 text-sm text-left"
              >
                ⚠️ {scanError}
              </div>
            )}

            <button
              onClick={startScanner}
              className="w-full py-5 bg-nu-green-500 hover:bg-nu-green-400 text-white
                         font-bold text-xl rounded-2xl shadow-nu-lg transition-all
                         active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">📷</span>
              Buka Kamera
            </button>

            {/* Tips */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "💡", tip: "Cahaya cukup" },
                { icon: "📐", tip: "Jarak 15-30cm" },
                { icon: "🎯", tip: "QR di tengah" },
              ].map(({ icon, tip }) => (
                <div key={tip} className="bg-white/5 rounded-xl p-3">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-nu-green-300 text-xs">{tip}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ FASE: SCANNING ══════════════════════ */}
        {phase === PHASE.SCANNING && (
          <div className="pt-6 space-y-6 animate-fade-in">
            <ScannerViewfinder containerId={SCANNER_ID} />

            <p className="text-center text-nu-green-300 text-sm">
              Arahkan ke QR Code kencleng warga
            </p>

            <button
              onClick={async () => {
                await stopScanner();
                handleReset();
              }}
              className="w-full py-3 border-2 border-nu-green-600/50 text-nu-green-400
                         rounded-xl font-medium hover:border-nu-green-500 transition-colors"
            >
              Batalkan
            </button>
          </div>
        )}

        {/* ══════════ FASE: LOOKUP (loading) ══════════════ */}
        {phase === PHASE.LOOKUP && (
          <div className="pt-20 text-center space-y-6 animate-fade-in">
            <div className="relative mx-auto w-20 h-20">
              <div
                className="w-20 h-20 border-4 border-nu-green-700 border-t-nu-green-400
                              rounded-full animate-spin"
              />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                🔍
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-lg">
                Mencari data warga...
              </p>
              <p className="text-nu-green-400 text-sm mt-1">
                Mohon tunggu sebentar
              </p>
            </div>
          </div>
        )}

        {/* ══════════ FASE: FORM (input nominal) ══════════ */}
        {phase === PHASE.FORM && warga && (
          <div className="pt-5 space-y-5 animate-slide-up">
            {/* Kartu warga */}
            <WargaCard warga={warga} />

            {/* Error server (jika submit gagal) */}
            {error && (
              <div
                className="bg-red-900/50 border border-red-500/40 text-red-300
                              rounded-xl p-3 text-sm"
              >
                ⚠️ {error}
              </div>
            )}

            {/* Form nominal dalam card putih */}
            <div className="bg-white rounded-2xl p-5 shadow-xl">
              <NominalForm
                warga={warga}
                onSubmit={handleSimpan}
                loading={phase === PHASE.SAVING}
              />
            </div>

            {/* Link scan ulang */}
            <button
              onClick={handleReset}
              className="w-full text-nu-green-400 text-sm py-2 hover:text-nu-green-300
                         transition-colors"
            >
              ← Scan QR lain
            </button>
          </div>
        )}

        {/* ══════════ FASE: SAVING (loading simpan) ════════ */}
        {phase === PHASE.SAVING && (
          <div className="pt-20 text-center space-y-6 animate-fade-in">
            <div className="relative mx-auto w-20 h-20">
              <div
                className="w-20 h-20 border-4 border-nu-green-700 border-t-nu-gold-400
                              rounded-full animate-spin"
              />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                💾
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-lg">
                Menyimpan setoran...
              </p>
              <p className="text-nu-green-400 text-sm mt-1">
                Jangan tutup halaman ini
              </p>
            </div>
          </div>
        )}

        {/* ══════════ FASE: SUCCESS ════════════════════════ */}
        {phase === PHASE.SUCCESS && transaksi && (
          <div className="pt-6">
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <SuccessScreen transaksi={transaksi} onScanLagi={handleReset} />
            </div>
          </div>
        )}

        {/* ══════════ FASE: ERROR ══════════════════════════ */}
        {phase === PHASE.ERROR && (
          <div className="pt-16 text-center space-y-6 animate-fade-in">
            <div className="text-7xl">😕</div>
            <div>
              <h2 className="text-xl font-bold text-white">
                QR Tidak Ditemukan
              </h2>
              <p className="text-nu-green-300 text-sm mt-2 leading-relaxed px-4">
                {error || "Warga tidak ditemukan dalam sistem"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 border-2 border-nu-green-600 text-nu-green-400
                           rounded-xl font-medium"
              >
                Kembali
              </button>
              <button
                onClick={startScanner}
                className="flex-1 py-3.5 bg-nu-green-600 text-white rounded-xl font-bold"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
