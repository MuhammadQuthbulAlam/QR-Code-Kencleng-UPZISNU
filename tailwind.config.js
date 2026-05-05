// ============================================================
// tailwind.config.js
// Konfigurasi Tailwind CSS dengan tema warna Nahdlatul Ulama
//
// Palet warna utama:
// - Hijau NU (nu-green): Warna identitas utama organisasi
// - Kuning/Emas (nu-gold): Aksen dan highlight
// - Putih/Krem (nu-cream): Background dan elemen netral
// ============================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  // ── File yang di-scan oleh Tailwind untuk class detection ──
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}", // Halaman (jika pakai pages router)
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // Komponen reusable
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}", // App router (Next.js 13+)
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}", // Module-specific components
  ],

  theme: {
    extend: {
      // ── Palet Warna Nahdlatul Ulama ────────────────────────
      colors: {
        // Hijau NU - Warna identitas utama
        // Berdasarkan warna resmi bendera dan logo NU
        "nu-green": {
          50: "#f0faf4", // Hijau sangat terang, untuk background subtle
          100: "#d9f2e3", // Hijau terang, untuk hover state ringan
          200: "#b3e5c8", // Hijau muda, untuk border atau badge ringan
          300: "#7dcca4", // Hijau sedang muda, untuk icon atau aksen
          400: "#4db582", // Hijau sedang, untuk tombol secondary
          500: "#2d9e57", // Hijau NU medium - warna utama
          600: "#1a7a3c", // Hijau NU gelap - warna brand utama (PALING SERING DIPAKAI)
          700: "#155f30", // Hijau tua, untuk hover pada elemen primary
          800: "#0f4522", // Hijau sangat tua, untuk teks di background terang
          900: "#092b15", // Hijau paling tua, untuk teks heading
          950: "#041509", // Hijau hampir hitam, untuk teks body gelap
        },

        // Emas NU - Aksen dan highlight (terinspirasi dari ornamen NU)
        "nu-gold": {
          50: "#fffbeb", // Kuning sangat terang
          100: "#fef3c7", // Kuning terang
          200: "#fde68a", // Kuning muda
          300: "#fcd34d", // Kuning cerah
          400: "#fbbf24", // Emas terang
          500: "#f5a623", // Emas NU - warna aksen utama
          600: "#d97706", // Emas gelap
          700: "#b45309", // Emas tua, untuk teks
          800: "#92400e", // Coklat emas
          900: "#78350f", // Coklat tua
        },

        // Krem NU - Background dan elemen netral (terinspirasi dari kitab kuning)
        "nu-cream": {
          50: "#fdfdf9", // Putih krem
          100: "#f9f7f0", // Krem sangat muda
          200: "#f3ede0", // Krem muda, untuk card background
          300: "#e8dfc9", // Krem sedang
          400: "#d4c4a0", // Krem tua
          500: "#bfa87a", // Tan/krem gelap
        },
      },

      // ── Font Family ────────────────────────────────────────
      fontFamily: {
        // Font utama untuk heading (Arabic-inspired calligraphy feel)
        display: ["var(--font-display)", "Poppins", "quicksand"],
        // Font untuk body text (mudah dibaca)
        body: ["var(--font-body)", "system-ui", "quicksand"],
        // Font monospace untuk code
        mono: ["var(--font-mono)", "Consolas", "monospace"],
      },

      // ── Box Shadow Kustom ──────────────────────────────────
      boxShadow: {
        // Shadow dengan warna hijau NU untuk elemen aktif/focus
        nu: "0 4px 14px 0 rgba(26, 122, 60, 0.15)",
        "nu-lg": "0 8px 30px 0 rgba(26, 122, 60, 0.20)",
        "nu-glow": "0 0 20px rgba(45, 158, 87, 0.40)", // Efek glow untuk focus state
      },

      // ── Border Radius Kustom ───────────────────────────────
      borderRadius: {
        nu: "0.625rem", // 10px - border radius khas komponen NU
      },

      // ── Animasi Kustom ─────────────────────────────────────
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out", // Animasi masuk halus
        "slide-up": "slideUp 0.4s ease-out", // Slide dari bawah
        "pulse-green": "pulseGreen 2s infinite", // Pulse dengan warna hijau
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(26, 122, 60, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(26, 122, 60, 0)" },
        },
      },

      // ── Background Pattern ─────────────────────────────────
      backgroundImage: {
        // Gradient khas NU (hijau gelap ke hijau medium)
        "nu-gradient":
          "linear-gradient(135deg, #092b15 0%, #1a7a3c 50%, #2d9e57 100%)",
        // Gradient header yang elegan
        "nu-header": "linear-gradient(to right, #0f4522, #1a7a3c)",
        // Gradient halus untuk card
        "nu-card": "linear-gradient(145deg, #f0faf4 0%, #ffffff 100%)",
      },
    },
  },

  // ── Plugin Tailwind ────────────────────────────────────────
  plugins: [
    // Plugin untuk typography (artikel/blog content)
    // Aktifkan jika install: npm install @tailwindcss/typography
    // require("@tailwindcss/typography"),
    // Plugin untuk form styling yang lebih baik
    // Aktifkan jika install: npm install @tailwindcss/forms
    // require("@tailwindcss/forms"),
  ],
};
