# EventHub

Platform manajemen dan penjualan tiket acara dua sisi — **End User** dapat mencari dan membeli tiket, **Event Organizer** dapat mengelola acara, layout kursi, dan menerima pembayaran.

---

## Fitur Utama

### End User
- Registrasi & login dengan verifikasi email
- Pencarian & filter acara (kategori, tanggal, kota, harga)
- Pembelian tiket dengan pilihan kursi (seat map interaktif)
- Checkout via Midtrans (VA, e-wallet, kartu kredit)
- Tiket digital dengan QR code unik per tiket
- Wishlist acara & notifikasi ketersediaan kursi
- Riwayat transaksi & permintaan refund

### Event Organizer
- Buat & kelola acara (publish, postpone, cancel)
- Builder layout venue (section, row, seat)
- Manajemen tipe tiket & kuota
- Konfigurasi payment gateway & kebijakan refund
- Dashboard real-time: scan kehadiran, kapasitas, pendapatan
- Laporan lengkap & pencairan dana (payout D+7 setelah acara)

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Backend** | NestJS 11 + Fastify, TypeScript 5 |
| **Frontend** | Angular 18 Standalone, PrimeNG, TailwindCSS 4 |
| **State Management** | NgRx SignalStore |
| **Database** | PostgreSQL 16 (Neon / Railway) |
| **ORM** | Prisma 6 |
| **Cache & Queue** | Redis 7 (Upstash) + BullMQ |
| **Real-time** | Socket.IO via `@nestjs/websockets` |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Payment** | Midtrans (primary), Xendit (fallback) |
| **Email** | Resend + React Email |
| **Push Notif** | Firebase Cloud Messaging |
| **SMS** | Zenziva |
| **Monorepo** | pnpm workspaces + Nx |
| **Deploy** | Railway (API + DB + Redis), Vercel (frontend) |
| **Monitoring** | Sentry, OpenTelemetry + Grafana Cloud |

---

## Struktur Monorepo

```
eventhub/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # Register, login, JWT, lockout
│   │       │   ├── organizer/  # CRUD event, layout, tiket, payout
│   │       │   ├── ticketing/  # Listing, seat map, order, QR scan
│   │       │   └── payment/    # Midtrans, webhook, refund
│   │       └── common/         # Guards, interceptors, Prisma, Redis
│   └── web/                    # Angular 18 frontend
│       └── src/app/
│           ├── features/
│           │   ├── auth/       # Login, register, forgot password
│           │   ├── events/     # Listing & detail acara publik
│           │   ├── organizer/  # Dashboard EO
│           │   ├── checkout/   # Alur pembelian tiket
│           │   └── account/    # Profil, tiket, transaksi, wishlist
│           ├── shared/         # UI components, pipes, directives
│           └── core/           # Guards, interceptors, WsService
├── libs/
│   ├── shared-types/           # Interface & enum dipakai kedua app
│   └── shared-utils/           # Utility: price, date, QR
├── prisma/
│   └── schema.prisma           # Full database schema
├── nixpacks.toml               # Railway build config
├── railway.json                # Railway deploy config
└── docker-compose.yml          # PostgreSQL, Redis, MinIO (local dev)
```

---

## Prasyarat

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker & Docker Compose (untuk local dev)

---

## Setup Local Development

### 1. Clone & install dependencies

```bash
git clone https://github.com/your-org/event-hub.git
cd event-hub
pnpm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env
# Edit .env — isi minimal: DATABASE_URL, REDIS_URL, JWT secrets,
# MIDTRANS keys, RESEND_API_KEY, STORAGE credentials
```

### 3. Jalankan infrastruktur lokal

```bash
docker-compose up -d
# Menjalankan: PostgreSQL 5432, Redis 6379, MinIO 9000
```

### 4. Setup database

```bash
pnpm db:generate    # generate Prisma client
pnpm db:migrate     # jalankan migrasi
pnpm db:seed        # (opsional) seed data awal
```

### 5. Build shared libraries

```bash
pnpm run build:libs
```

### 6. Jalankan API

```bash
pnpm dev:api
# API running di http://localhost:3000
# Swagger docs di http://localhost:3000/api/docs
```

### 7. Jalankan frontend (terminal terpisah)

```bash
pnpm dev:web
# Angular dev server di http://localhost:4200
```

---

## API Overview

Base URL: `http://localhost:3000/api/v1`

| Modul | Prefix | Keterangan |
|---|---|---|
| Auth | `/auth` | Register, login, refresh token, forgot/reset password |
| Organizer | `/organizer` | CRUD event, layout, tiket, payout (role: ORGANIZER) |
| Ticketing | `/tickets` | Listing publik, order, QR scan |
| Payment | `/payments` | Inisiasi pembayaran, webhook Midtrans, refund |

**Response envelope selalu:**
```json
{ "success": true, "data": { ... }, "meta": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

Health check: `GET /api/health`

---

## WebSocket Namespaces

| Namespace | Keterangan | Auth |
|---|---|---|
| `/ws/organizer` | Dashboard EO: check-in, kapasitas, revenue real-time | Bearer token |
| `/ws/seats` | Seat map: status kursi live (locked/sold/available) | Tidak wajib |
| `/ws/orders` | Status order pembeli (PENDING → PAID / EXPIRED) | Bearer token |
| `/ws/payments` | Status pembayaran live | Bearer token |

Token dikirim sebagai query param: `?token=<access_token>`

---

## Deploy ke Railway

### Prasyarat
1. Buat project Railway baru
2. Tambahkan plugin **PostgreSQL** dan **Redis** — Railway akan auto-inject `DATABASE_URL` dan `REDIS_URL`
3. Set semua environment variable dari `.env.example` (lihat bagian [Credentials](#credentials))

### Build & Start
Sudah dikonfigurasi via `nixpacks.toml` dan `railway.json`:

```
Build  : pnpm install → build shared libs → prisma generate → build API
Start  : prisma migrate deploy → node apps/api/dist/main.js
Health : GET /api/health
```

Tidak perlu konfigurasi manual tambahan — Railway mendeteksi `nixpacks.toml` secara otomatis.

---

## Credentials

| Kategori | Variabel | Cara Mendapatkan |
|---|---|---|
| **Auto (Railway)** | `DATABASE_URL`, `REDIS_URL` | Inject otomatis dari plugin |
| **Generate sendiri** | `COOKIE_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_TOKEN_SECRET`, `INTERNAL_SERVICE_TOKEN` | `openssl rand -base64 64` |
| **Midtrans** | `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` | [dashboard.midtrans.com](https://dashboard.midtrans.com) → Settings → Access Keys |
| **Xendit** | `XENDIT_SECRET_KEY` | [dashboard.xendit.co](https://dashboard.xendit.co) → API Keys |
| **Resend** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | [resend.com](https://resend.com) → API Keys (domain harus diverifikasi) |
| **Firebase** | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service Accounts |
| **Cloudflare R2** | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET_NAME`, `STORAGE_PUBLIC_URL` | Cloudflare Dashboard → R2 → Manage API Tokens |
| **Zenziva** | `ZENZIVA_USER_KEY`, `ZENZIVA_PASSWORD` | [zenziva.id](https://www.zenziva.id) → Akun → API Settings |
| **Sentry** | `SENTRY_DSN` | [sentry.io](https://sentry.io) → Project → Client Keys |

---

## Business Rules Kritis

| Rule | Deskripsi |
|---|---|
| BR-AUTH-002 | Login gagal ≥5× dalam 30 menit → akun dikunci 15 menit |
| BR-AUTH-003 | Akun baru tidak aktif sampai email diverifikasi |
| BR-TKT-001 | Seat lock 10 menit saat order dibuat, lepas otomatis via BullMQ |
| BR-TKT-002 | Maks 5 tiket per user per acara (EO bisa set maks 10) |
| BR-TKT-003 | QR hanya berlaku sekali — scan ulang ditolak (`ALREADY_USED`) |
| BR-ORG-001 | Tidak bisa ubah tanggal/lokasi < 6 jam sebelum acara |
| BR-ORG-002 | Total kuota tiket ≤ kapasitas venue + 5% |
| BR-ORG-003 | Payout D+7 setelah acara selesai, hanya jika tidak ada sengketa |
| BR-ORG-005 | EO cancel → refund otomatis semua pembeli, EO tidak dapat payout |
| BR-PAY-001 | VA timeout 60 menit, e-wallet/CC timeout 15 menit |
| BR-PAY-003 | Platform fee 3% dari nilai transaksi |
| BR-PAY-006 | Webhook idempotent — duplikat tidak diproses ulang |

---

## Scripts

```bash
# Development
pnpm dev:api          # jalankan API (tsx watch)
pnpm dev:web          # jalankan Angular dev server

# Build
pnpm run build:libs   # compile shared-types + shared-utils
pnpm run build:api    # build API ke apps/api/dist/
pnpm run build:web    # build Angular ke apps/web/dist/

# Database
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # seed data awal
pnpm db:studio        # buka Prisma Studio

# Quality
pnpm lint             # lint semua package
pnpm test             # test semua package
pnpm format           # format dengan Prettier
```
