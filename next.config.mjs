// ============================================================
// next.config.mjs
// Konfigurasi utama Next.js
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Experimental features ──────────────────────────────────
  experimental: {
    // Mengaktifkan Server Actions untuk form handling tanpa API route
    serverActions: {
      allowedOrigins: ["localhost:3000"], // Domain yang diizinkan
    },
  },

  // ── Konfigurasi gambar eksternal ───────────────────────────
  // Daftarkan domain yang boleh serve gambar via next/image
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub avatars
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pictures
      },
      {
        protocol: "https",
        hostname: "*.nu.or.id", // Domain resmi NU
      },
    ],
  },

  // ── Redirect rules ─────────────────────────────────────────
  async redirects() {
    return [
      {
        // Redirect root ke dashboard jika user sudah login
        // (middleware.js yang handle logika autentikasi-nya)
        source: "/",
        destination: "/dashboard",
        permanent: false, // 307 Temporary Redirect
      },
    ];
  },

  // ── Header keamanan HTTP ───────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)", // Berlaku untuk semua route
        headers: [
          {
            // Mencegah clickjacking
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Mencegah MIME type sniffing
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Referrer policy untuk privasi
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
