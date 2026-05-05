// ============================================================
// postcss.config.js
// Konfigurasi PostCSS sebagai preprocessor CSS
// Dibutuhkan oleh Tailwind CSS untuk bekerja dengan Next.js
// ============================================================

module.exports = {
  plugins: {
    // Plugin Tailwind CSS - mengompilasi utility classes
    tailwindcss: {},

    // Autoprefixer - menambahkan vendor prefix otomatis
    // Contoh: -webkit-, -moz-, -ms- untuk kompatibilitas browser
    autoprefixer: {},
  },
};
