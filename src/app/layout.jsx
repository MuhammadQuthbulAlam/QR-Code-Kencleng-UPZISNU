// ============================================================
// src/app/layout.jsx
// Root Layout - Komponen pembungkus untuk semua halaman
// Layout ini dirender satu kali dan wrap semua route
// ============================================================

import { Inter, Amiri } from "next/font/google";
import "./globals.css";

// ── Konfigurasi Font ─────────────────────────────────────────
// Font utama untuk teks body (modern & mudah dibaca)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",   // Nama CSS variable yang bisa dipakai di Tailwind
  display: "swap",           // Fallback font saat font asli loading
});

// Font display bergaya Arab/Islam untuk heading dan branding NU
const amiri = Amiri({
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
  variable: "--font-display", // CSS variable untuk heading font
  display: "swap",
});

// ── Metadata SEO ─────────────────────────────────────────────
export const metadata = {
  title: {
    default: "Portal Nahdlatul Ulama",               // Title default
    template: "%s | Portal Nahdlatul Ulama",          // Template untuk halaman lain
  },
  description:
    "Portal digital resmi Nahdlatul Ulama - Jam'iyyah Diniyyah Islamiyyah Ijtima'iyyah",
  keywords: ["Nahdlatul Ulama", "NU", "Islam", "Indonesia", "Aswaja"],
  authors: [{ name: "Tim Digital NU" }],
  openGraph: {
    type: "website",
    locale: "id_ID",               // Bahasa Indonesia
    siteName: "Portal Nahdlatul Ulama",
  },
};

// ── Root Layout Component ────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html
      lang="id"  // Bahasa Indonesia
      // Menggabungkan CSS variable dari kedua font
      className={`${inter.variable} ${amiri.variable}`}
    >
      <body
        className={`
          font-body          /* Gunakan font body sebagai default */
          bg-nu-cream-50     /* Background krem muda khas NU */
          text-nu-green-900  /* Teks default hijau tua */
          antialiased        /* Font rendering lebih halus */
          min-h-screen       /* Minimal tinggi full viewport */
        `}
      >
        {/* ── Main Content Area ─────────────────────── */}
        {/* children = konten halaman yang sedang aktif */}
        <main>{children}</main>

        {/* ── Toast Notifications ───────────────────── */}
        {/* Sonner toast provider untuk notifikasi sistem */}
        {/* <Toaster position="top-right" richColors /> */}
      </body>
    </html>
  );
}
