// ============================================================
// src/app/login/page.jsx
// Halaman Login
// Tampilan form autentikasi dengan tema Nahdlatul Ulama
// ============================================================

"use client"; // Butuh interaktivitas (form, state) -> Client Component

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  // ── State form ──────────────────────────────────────────────
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Handler input change ─────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null); // Reset error saat user mulai mengetik
  };

  // ── Handler form submit ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault(); // Mencegah reload halaman
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implementasi login dengan NextAuth
      await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: true,
        callbackUrl: "/dashboard",
      });

      // Simulasi delay untuk demo
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Login dengan:", formData.email);
    } catch (err) {
      setError("Email atau password salah. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ── Full page layout dengan background gradient NU ────────
    <div className="min-h-screen bg-nu-gradient flex items-center justify-center p-4">
      {/* ── Islamic pattern overlay ── */}
      <div className="absolute inset-0 bg-islamic-pattern opacity-10 pointer-events-none" />

      {/* ── Login Card ──────────────────────────────────────── */}
      <div className="relative w-full max-w-md animate-slide-up">
        {/* ── Header Card ─────────────────────────────────── */}
        <div className="text-center mb-8">
          {/* Logo NU */}
          <div
            className="w-56 h-36 bg-transparent rounded-xl flex items-center justify-center
                          text-4xl mx-auto shadow-xl mb-4"
          >
            <Image
              src="/logo/logo1.png"
              alt="Logo MWC Leuwimunding"
              width={180}
              height={60}
              className="w-[160px] md:w-[180px] h-auto absolute pointer-events-none"
              priority
            />
          </div>
          <h1 className="font-mono text-3xl font-bold text-white">
            Portal Kencleng MWC Leuwimunding
          </h1>
        </div>

        {/* ── Form Card ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-mono font-bold text-nu-green-700 mb-6 text-center">
            Masuk ke Akun Anda
          </h2>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-nu p-3 mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Input Email ────────────────────────────── */}
            <div>
              <label htmlFor="email" className="form-label">
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contoh@nu.or.id"
                className="input-field"
                disabled={isLoading}
              />
            </div>

            {/* ── Input Password ─────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="form-label mb-0">
                  Password
                </label>
                {/* Link lupa password */}
                <Link
                  href="/forgot-password"
                  className="text-xs text-nu-green-600 hover:text-nu-green-800 font-medium"
                >
                  Lupa password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Masukkan password"
                className="input-field"
                disabled={isLoading}
              />
            </div>

            {/* ── Submit Button ───────────────────────────── */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full text-center justify-center flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  {/* Loading spinner sederhana dengan CSS */}
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent
                                   rounded-full animate-spin"
                  />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* ── Divider ────────────────────────────────────── */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-nu-green-100" />
            <span className="text-xs text-nu-green-400">atau</span>
            <div className="flex-1 h-px bg-nu-green-100" />
          </div>

          {/* ── Footer text ────────────────────────────────── */}
          <p className="text-center text-sm text-nu-green-600">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-nu-green-700 hover:text-nu-green-900"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>

        {/* ── Copyright di bawah card ────────────────────── */}
        <p className="text-center text-nu-green-300 text-xs mt-6">
          © {new Date().getFullYear()} MWC Nahdlatul Ulama Leuwimunding. Semua
          hak dilindungi.
        </p>
      </div>
    </div>
  );
}
