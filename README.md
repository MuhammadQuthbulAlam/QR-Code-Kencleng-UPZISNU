# 🕌 Portal Digital Nahdlatul Ulama

> **Next.js Fullstack Production-Ready** dengan Clean Architecture

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com)

---

## 🚀 Cara Menjalankan Project

### Prasyarat

Pastikan sudah terinstall:
- **Node.js** >= 18.17.0
- **PostgreSQL** (lokal atau cloud)
- **npm** atau **pnpm**

### 1. Clone & Setup Environment

```bash
# Clone repository
git clone <repo-url>
cd nextjs-nu-project

# Salin template environment
cp .env.example .env.local
```

Edit `.env.local` dan isi `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/nu_portal_db"
NEXTAUTH_SECRET="random-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Jalankan migrasi (buat tabel di database)
npx prisma migrate dev --name init

# Isi data awal (seed)
npm run db:seed
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka **http://localhost:3000** di browser. ✅

---

## 📁 Struktur Project

```
nextjs-nu-project/
├── prisma/
│   ├── schema.prisma          # Schema database PostgreSQL
│   └── seed.js                # Data awal untuk development
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes (REST endpoints)
│   │   │   ├── auth/          # Endpoint autentikasi
│   │   │   └── users/         # CRUD user
│   │   ├── dashboard/         # Halaman dashboard
│   │   ├── login/             # Halaman login
│   │   ├── layout.jsx         # Root layout
│   │   └── globals.css        # Global styles
│   │
│   ├── modules/               # Feature modules (domain-driven)
│   │   ├── auth/
│   │   │   ├── domain/        # Entity & business rules auth
│   │   │   ├── application/   # Use cases (AuthService)
│   │   │   └── infrastructure/ # NextAuth adapter
│   │   └── users/
│   │       ├── domain/        # User entity
│   │       ├── application/   # UserService (use cases)
│   │       └── infrastructure/ # UserRepository (Prisma)
│   │
│   ├── core/                  # Shared core (tanpa dependencies luar)
│   │   ├── errors/            # Custom error classes
│   │   ├── types/             # TypeScript types/interfaces
│   │   └── utils/             # Utility functions
│   │
│   ├── infrastructure/        # Implementasi teknis
│   │   ├── database/          # Koneksi Prisma (db.js)
│   │   └── repositories/      # Base repository
│   │
│   └── interfaces/            # Layer antarmuka
│       ├── http/
│       │   ├── middlewares/   # Auth middleware
│       │   └── validators/    # Zod schemas
│       └── repositories/      # Interface (kontrak) repository
│
├── package.json
├── tailwind.config.js         # Tema warna Nahdlatul Ulama
├── next.config.mjs
└── tsconfig.json
```

---

## 🏗️ Clean Architecture

```
Request → Interface Layer → Application Layer → Domain Layer
                              ↓
                         Infrastructure Layer → Database
```

| Layer | Folder | Tanggung Jawab |
|-------|--------|----------------|
| **Domain** | `modules/*/domain` | Entity, business rules, tidak ada dependencies |
| **Application** | `modules/*/application` | Use cases, orchestrasi service |
| **Infrastructure** | `modules/*/infrastructure` | Database, repository Prisma |
| **Interface** | `app/api`, `interfaces` | HTTP, middleware, validator |

---

## 🎨 Tema Warna Nahdlatul Ulama

Gunakan class Tailwind dengan prefix `nu-`:

```jsx
// Warna utama
<div className="bg-nu-green-600 text-white">Hijau NU</div>
<div className="bg-nu-gold-500 text-white">Emas NU</div>
<div className="bg-nu-cream-200">Krem NU</div>

// Komponen siap pakai
<button className="btn-primary">Tombol Utama</button>
<button className="btn-secondary">Tombol Sekunder</button>
<button className="btn-gold">Tombol Emas</button>
<div className="card p-4">Card Standard</div>
<input className="input-field" />
```

---

## 📋 Perintah yang Tersedia

```bash
npm run dev          # Development server
npm run build        # Build production
npm run start        # Production server

npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Migrasi database
npm run db:push      # Push schema tanpa migrasi
npm run db:studio    # Buka Prisma Studio (GUI database)
npm run db:seed      # Jalankan seeder
npm run db:reset     # Reset database

npm run lint         # ESLint
npm run type-check   # TypeScript check
```

---

## 🔑 Akun Default (setelah seed)

| Email | Password | Role |
|-------|----------|------|
| admin@nu.or.id | Admin@123 | ADMIN |

---

## 📦 Tech Stack

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Next.js | 14 | Framework fullstack |
| React | 18 | UI library |
| Prisma | 5 | ORM database |
| PostgreSQL | 16 | Database |
| NextAuth.js | 5 beta | Autentikasi |
| Tailwind CSS | 3 | Styling |
| Zod | 3 | Validasi schema |
| bcryptjs | 2 | Hash password |
| TanStack Query | 5 | Data fetching |
| React Hook Form | 7 | Form handling |

---

## 🤝 Kontribusi

Silakan buat Pull Request atau laporkan issue. Semua kontribusi disambut baik!

---

*Hubbul Wathon Minal Iman — Cinta Tanah Air Adalah Sebagian dari Iman*
