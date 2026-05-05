// ============================================================
// prisma/seed.js
// Script untuk mengisi data awal ke database
// Jalankan: node prisma/seed.js  ATAU  npm run db:seed
// ============================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Mulai seeding database...\n");

  // ── 1. Buat akun Admin default ─────────────────────────────
  const hashedPassword = await bcrypt.hash("Admin@123", 12); // Hash password dengan salt rounds 12

  const admin = await prisma.user.upsert({
    where: { email: "admin@nu.or.id" }, // Cari user dengan email ini
    update: {}, // Jika sudah ada, tidak update apapun
    create: {
      email: "admin@nu.or.id",
      name: "Administrator NU",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Admin dibuat: ${admin.email}`);

  // ── 2. Buat kategori default ────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "berita" },
      update: {},
      create: {
        name: "Berita",
        slug: "berita",
        description: "Berita terkini seputar Nahdlatul Ulama",
        color: "#1a7a3c", // Hijau NU gelap
      },
    }),
    prisma.category.upsert({
      where: { slug: "pengumuman" },
      update: {},
      create: {
        name: "Pengumuman",
        slug: "pengumuman",
        description: "Pengumuman resmi organisasi",
        color: "#2d9e57", // Hijau NU medium
      },
    }),
    prisma.category.upsert({
      where: { slug: "kajian" },
      update: {},
      create: {
        name: "Kajian",
        slug: "kajian",
        description: "Kajian keagamaan dan keilmuan",
        color: "#f5a623", // Kuning/emas aksen NU
      },
    }),
  ]);
  console.log(`✅ ${categories.length} kategori dibuat`);

  // ── 3. Buat tag default ─────────────────────────────────────
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: "islam" },
      update: {},
      create: { name: "Islam", slug: "islam" },
    }),
    prisma.tag.upsert({
      where: { slug: "organisasi" },
      update: {},
      create: { name: "Organisasi", slug: "organisasi" },
    }),
    prisma.tag.upsert({
      where: { slug: "kebangsaan" },
      update: {},
      create: { name: "Kebangsaan", slug: "kebangsaan" },
    }),
  ]);
  console.log(`✅ ${tags.length} tag dibuat`);

  // ── 4. Buat artikel contoh ──────────────────────────────────
  const samplePost = await prisma.post.upsert({
    where: { slug: "selamat-datang-di-portal-nu" },
    update: {},
    create: {
      title: "Selamat Datang di Portal Digital Nahdlatul Ulama",
      slug: "selamat-datang-di-portal-nu",
      content: `
# Selamat Datang

Portal digital ini hadir untuk mempererat silaturahmi antara warga Nahdliyin.

## Visi Kami
Menjadi pusat informasi dan komunikasi bagi seluruh warga NU di seluruh Indonesia.

## Fitur Unggulan
- Berita terkini organisasi
- Kajian keagamaan
- Forum diskusi
- Direktori anggota
      `.trim(),
      excerpt:
        "Portal digital Nahdlatul Ulama hadir untuk mempererat silaturahmi warga Nahdliyin.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: admin.id,
      categoryId: categories[0].id, // Kategori "Berita"
      tags: {
        // Hubungkan dengan tag menggunakan createMany
        create: [
          { tag: { connect: { id: tags[0].id } } }, // Tag "Islam"
          { tag: { connect: { id: tags[1].id } } }, // Tag "Organisasi"
        ],
      },
    },
  });
  console.log(`✅ Artikel contoh dibuat: "${samplePost.title}"`);

  console.log("\n🎉 Seeding selesai!");
}

// Jalankan fungsi main dan tangani error
main()
  .catch((error) => {
    console.error("❌ Error saat seeding:", error);
    process.exit(1); // Exit dengan kode error
  })
  .finally(async () => {
    // Selalu tutup koneksi database setelah selesai
    await prisma.$disconnect();
  });
