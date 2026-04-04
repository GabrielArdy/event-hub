# EventHub — Frontend Product Brief

> **Version:** 1.0.0 | **Date:** April 2026
> **Stack:** Angular 18 Standalone · PrimeNG · TailwindCSS 4 · NgRx SignalStore
> **API Base:** `https://api.eventhub.id/api/v1`

---

## 1. Ringkasan Produk

EventHub adalah platform dua sisi:
- **End User** — mencari, memesan, dan menghadiri acara
- **Event Organizer (EO)** — membuat, mengelola, dan memonetisasi acara

Frontend Angular melayani kedua sisi dalam satu aplikasi dengan lazy-loaded feature modules dan role-based routing.

---

## 2. Design Principles

| Prinsip | Penerapan |
|---|---|
| **Mobile-first** | Semua halaman responsif, breakpoint utama: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px` |
| **Real-time first** | Status seat, order, payment — semua via WebSocket, bukan polling |
| **Speed perception** | Skeleton loader di setiap list/card, optimistic UI untuk wishlist & pilih kursi |
| **Trust signal** | Tampilkan nama EO, badge verified, jumlah pembeli di setiap event card |
| **Clarity over density** | Form checkout maksimal 2 langkah, konfirmasi sebelum aksi destruktif |

---

## 3. Design System

### 3.1 Color Palette

```
Primary     : #6C63FF  (violet — brand utama, CTA)
Primary Dark: #5A52D5  (hover state)
Secondary   : #FF6584  (accent, badge sold-out, urgent)
Success     : #22C55E  (payment success, tiket aktif)
Warning     : #F59E0B  (peringatan kapasitas, hampir habis)
Danger      : #EF4444  (error, cancel, expired)
Neutral 900 : #111827  (teks utama)
Neutral 500 : #6B7280  (teks sekunder, placeholder)
Neutral 100 : #F3F4F6  (background card, input)
White       : #FFFFFF
```

### 3.2 Typography

```
Font Family : Inter (sans-serif) — sudah tersedia via Tailwind
Heading 1   : 2rem / 700 / tight leading
Heading 2   : 1.5rem / 600
Heading 3   : 1.25rem / 600
Body        : 1rem / 400 / relaxed leading
Caption     : 0.875rem / 400 / neutral-500
Price       : 1.125rem / 700 / primary — selalu tampilkan "Rp" prefix
```

### 3.3 Spacing & Radius

```
Base unit   : 4px (Tailwind default)
Card radius : rounded-2xl (16px)
Button      : rounded-full untuk CTA primer, rounded-lg untuk sekunder
Input       : rounded-lg
Modal       : rounded-2xl, max-w-lg
```

### 3.4 PrimeNG Theme

Gunakan PrimeNG **Lara Light** theme dengan override variable berikut di `styles.scss`:

```scss
:root {
  --primary-color: #6C63FF;
  --primary-color-text: #ffffff;
  --surface-card: #ffffff;
  --surface-ground: #F9FAFB;
  --border-radius: 12px;
  --font-family: 'Inter', sans-serif;
}
```

---

## 4. Struktur Halaman

### 4.1 Public (GUEST + END_USER)

| Route | Halaman | Komponen Kunci |
|---|---|---|
| `/` | **Home / Event Listing** | `EventCardComponent`, filter bar, hero banner |
| `/events/:id` | **Event Detail** | foto, deskripsi, seat map preview, harga tiket, CTA beli |
| `/auth/login` | **Login** | form email+password, link SSO (future), error lockout |
| `/auth/register` | **Register** | form 1 halaman, pilih role END_USER atau ORGANIZER |
| `/auth/verify-email` | **Verifikasi Email** | ilustrasi, status polling, resend button |
| `/auth/forgot-password` | **Lupa Password** | email input, konfirmasi pengiriman |
| `/auth/reset-password` | **Reset Password** | password baru + konfirmasi |

### 4.2 End User (role: END_USER)

| Route | Halaman | Komponen Kunci |
|---|---|---|
| `/checkout/:event_id` | **Checkout Step 1 — Pilih Tiket** | pilih tipe tiket, qty, seat map interaktif |
| `/checkout/:event_id/payment` | **Checkout Step 2 — Pembayaran** | ringkasan order, pilih metode, countdown timer |
| `/checkout/success/:order_id` | **Pembayaran Berhasil** | animasi sukses, QR preview, tombol ke "Tiket Saya" |
| `/checkout/pending/:order_id` | **Menunggu Pembayaran** | VA/redirect info, countdown, WS status listener |
| `/me/tickets` | **Tiket Saya** | list tiket aktif, riwayat, filter status |
| `/me/tickets/:ticket_id` | **Detail Tiket** | QR code besar, info acara, tombol download PDF |
| `/me/transactions` | **Riwayat Transaksi** | list order dengan status, link ke detail |
| `/me/wishlist` | **Wishlist** | event yang di-wishlist, tombol beli langsung |
| `/me/profile` | **Profil** | edit nama, foto, password |
| `/me/apply-organizer` | **Daftar jadi EO** | form KTP, nama organisasi, dokumen |

### 4.3 Event Organizer (role: ORGANIZER)

| Route | Halaman | Komponen Kunci |
|---|---|---|
| `/organizer` | **Dashboard EO** | stats card (revenue, tiket terjual, check-in), recent activity |
| `/organizer/events` | **Daftar Event** | tabel event dengan status badge, aksi cepat |
| `/organizer/events/new` | **Buat Event** | multi-step form (Info → Venue → Tiket → Review) |
| `/organizer/events/:id/edit` | **Edit Event** | sama dengan form buat, pre-filled |
| `/organizer/events/:id/layout` | **Builder Layout** | drag & drop section/row/seat, canvas interaktif |
| `/organizer/events/:id/tickets` | **Manajemen Tiket** | CRUD tipe tiket, kuota, harga |
| `/organizer/events/:id/live` | **Dashboard Live** | real-time check-in, kapasitas, revenue (WS) |
| `/organizer/events/:id/report` | **Laporan Event** | grafik penjualan, demografi, export CSV |
| `/organizer/events/:id/payout` | **Pencairan Dana** | status payout, rincian fee platform (3%), tanggal cair |
| `/organizer/profile` | **Profil EO** | logo, nama org, deskripsi, verifikasi dokumen |

---

## 5. User Flow Kritis

### 5.1 Alur Beli Tiket (End User)

```
Event Listing
    │ klik card
    ▼
Event Detail
    │ klik "Beli Tiket"
    │ → redirect ke /auth/login jika belum login
    ▼
Checkout Step 1 — Pilih Tiket
    ├── pilih tipe tiket
    ├── pilih kursi (jika ada seat map)
    │   └── kursi berubah warna "terkunci" live via WS /ws/seats
    └── klik "Lanjut ke Pembayaran"
         │ → API: POST /api/v1/tickets/orders
         │ → seat dikunci 10 menit (BR-TKT-001)
         │ → BullMQ job release-seat-lock dijadwalkan
         ▼
Checkout Step 2 — Pembayaran
    ├── pilih metode: VA Bank / E-Wallet / Kartu Kredit
    ├── countdown timer (60 mnt VA / 15 mnt e-wallet)
    │   └── saat timer habis → WS ORDER_EXPIRED → redirect ke halaman expired
    └── klik "Bayar Sekarang"
         │ → API: POST /api/v1/payments/initiate
         │ → tampilkan nomor VA / redirect ke e-wallet
         │ → WS /ws/payments listener aktif
         ▼
    [User bayar di luar app]
         │
         ├── WS: PAYMENT_SUCCESS → redirect ke /checkout/success/:order_id
         └── WS: PAYMENT_FAILED  → tampilkan error, opsi coba lagi
```

### 5.2 Alur Buat Event (EO)

```
Dashboard EO → klik "Buat Event"
    ▼
Step 1 — Informasi Dasar
    : judul, kategori, deskripsi, banner upload
    │ auto-save draft tiap 2 menit (BR-ORG-006)
    ▼
Step 2 — Venue & Jadwal
    : tipe (fisik/online), lokasi, tanggal & waktu
    │ validasi: start_at harus di masa depan
    ▼
Step 3 — Tiket
    : tambah minimal 1 tipe tiket, harga, kuota
    │ total kuota ≤ kapasitas + 5% (BR-ORG-002)
    ▼
Step 4 — Review & Publish
    : preview tampilan event
    └── "Simpan Draft" atau "Publish"
         │ → API: POST /organizer/events + POST /organizer/events/:id/publish
         ▼
    Event muncul di listing publik
```

### 5.3 Alur Check-in Live (EO)

```
Dashboard Live (/organizer/events/:id/live)
    │
    ├── WS /ws/organizer: connect dengan token + eventId
    ├── Tampilkan:
    │   ├── jumlah check-in / total tiket (progress bar)
    │   ├── revenue real-time
    │   └── feed aktivitas terbaru
    │
    └── Scan QR (klik "Scan Tiket")
         │ → buka kamera / input manual
         │ → API: POST /tickets/:ticket_id/validate
         ├── sukses → WS CHECKIN_UPDATE → counter naik, feed update
         └── gagal → tampilkan error (ALREADY_USED / INVALID_QR_TOKEN)
```

---

## 6. Komponen Shared

### 6.1 `EventCardComponent`
```
Input  : EventSummary (title, banner, date, venue, price_min, organizer)
Output : clicked (EventEmit)
UI     : card dengan banner 16:9, badge kategori, badge "Hampir Habis" (<10%),
         harga mulai, nama organizer, tombol wishlist (❤)
Animasi: hover scale-[1.02] transition-transform
```

### 6.2 `SeatMapComponent`
```
Input  : EventLayout, selectedSeats[], lockedSeats[], soldSeats[]
Output : seatToggled (string[])
UI     : grid kursi SVG/canvas, legend warna:
         ■ abu  = available
         ■ ungu = selected (user ini)
         ■ orange = locked (user lain, live via WS)
         ■ merah = sold
Real-time: subscribe WS /ws/seats → patch state kursi terkunci/terbeli
```

### 6.3 `CountdownTimerComponent`
```
Input  : expiresAt (ISO8601), warningAt (seconds remaining)
Output : expired (EventEmit)
UI     : MM:SS, warna merah + pulse saat < warningAt
Auto   : emit expired event → parent handle redirect
```

### 6.4 `TicketQrComponent`
```
Input  : qrToken (string), ticketId, eventTitle, seatInfo
UI     : QR code besar (qrcode.js), info tiket, tombol download PDF
Note   : QR tidak boleh di-screenshot → overlay watermark nama user
```

### 6.5 `StatusBadgeComponent`
```
Input  : status (EventStatus | OrderStatus | TicketStatus)
UI     : pill berwarna sesuai status:
         DRAFT → gray, PUBLISHED → blue, ONGOING → green
         PENDING_PAYMENT → yellow, PAID → green, EXPIRED → red
         ACTIVE → green, USED → purple, REFUNDED → orange
```

### 6.6 `PriceDisplayComponent`
```
Input  : amountIdr (number)
UI     : "Rp 150.000" — selalu format IDR dengan titik pemisah ribuan
Note   : gunakan pipe custom `idrCurrency` dari shared-utils
```

---

## 7. State Management (NgRx SignalStore)

Satu store per feature, disediakan di root atau feature level:

| Store | State Utama | Methods |
|---|---|---|
| `AuthStore` | `user`, `accessToken`, `isLoggedIn` | `login()`, `logout()`, `refreshToken()` |
| `EventsStore` | `events[]`, `filters`, `selectedEvent` | `loadEvents()`, `loadDetail()`, `toggleWishlist()` |
| `CheckoutStore` | `order`, `selectedSeats[]`, `paymentStatus` | `createOrder()`, `initiatePayment()`, `listenPaymentWs()` |
| `OrganizerStore` | `myEvents[]`, `draftEvent`, `liveStats` | `createEvent()`, `saveDraft()`, `publish()` |
| `TicketsStore` | `myTickets[]`, `selectedTicket` | `loadMyTickets()`, `validateTicket()` |

---

## 8. HTTP & WebSocket Integration

### 8.1 HTTP Interceptors

```
AuthInterceptor       : tambah header Authorization: Bearer <token>
RefreshInterceptor    : jika 401 → coba refresh token → retry request
ErrorInterceptor      : normalisasi error envelope → toast notification
LoadingInterceptor    : toggle global loading signal
```

### 8.2 WebSocket Service (Core)

```typescript
// core/services/ws.service.ts
// Satu service global, manage semua namespace

connect(namespace: '/ws/seats' | '/ws/orders' | '/ws/payments' | '/ws/organizer',
        params: Record<string, string>): Observable<WsMessage>

// Reconnection: exponential backoff 1s → 2s → 4s → 8s (max)
// Heartbeat: ping setiap 30s, reconnect jika tidak ada pong dalam 10s
```

### 8.3 API Endpoints per Halaman

| Halaman | Endpoint |
|---|---|
| Event Listing | `GET /tickets/events` |
| Event Detail | `GET /tickets/events/:id` + `GET /tickets/events/:id/seat-map` |
| Checkout Step 1 | `POST /tickets/orders` |
| Checkout Step 2 | `POST /payments/initiate` |
| Tiket Saya | `GET /tickets/me/tickets` |
| Detail Tiket | `GET /tickets/me/tickets/:id` |
| Dashboard EO | `GET /organizer/events` |
| Buat Event | `POST /organizer/events` → `POST .../publish` |
| Live Dashboard | `GET /organizer/events/:id/report` + WS `/ws/organizer` |

---

## 9. Halaman per Halaman — UI Spec

### 9.1 Home / Event Listing

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: Logo | Cari | Kategori | Login/Avatar       │
├─────────────────────────────────────────────────────┤
│  HERO: banner carousel 3 acara featured              │
│        "Temukan Acara Terbaikmu" + search bar        │
├─────────────────────────────────────────────────────┤
│  FILTER BAR: Kategori chips | Kota | Tanggal | Harga │
├─────────────────────────────────────────────────────┤
│  GRID 3 KOLOM (desktop) / 1 KOLOM (mobile)          │
│  ┌──────┐ ┌──────┐ ┌──────┐                         │
│  │banner│ │banner│ │banner│  EventCard × n           │
│  │      │ │      │ │      │                         │
│  └──────┘ └──────┘ └──────┘                         │
│  [Load More] atau infinite scroll                    │
└─────────────────────────────────────────────────────┘
```

**Interaksi:**
- Filter mengupdate URL query params (`?category=MUSIC&city=Jakarta`)
- Skeleton loader 6 card saat loading
- Wishlist toggle ❤ optimistic (langsung berubah, rollback jika error)
- Badge "🔥 Hampir Habis" muncul jika kuota tersisa < 10%

---

### 9.2 Event Detail

```
┌─────────────────────────────────────────────────────┐
│  BREADCRUMB: Home > Musik > Konser Akhir Tahun       │
├─────────────────────────────────────────────────────┤
│  BANNER 16:9 full-width + badge kategori             │
├──────────────────────────┬──────────────────────────┤
│  KIRI (60%)              │  KANAN (40%) sticky       │
│  ─ Judul H1              │  ┌────────────────────┐  │
│  ─ Organizer + avatar    │  │ Harga mulai Rp xxx │  │
│  ─ 📅 Tanggal & Waktu    │  │ [Beli Tiket] CTA   │  │
│  ─ 📍 Venue + maps link  │  │ ─────────────────  │  │
│  ─ Deskripsi lengkap     │  │ Tipe Tiket:        │  │
│  ─ Tab: Deskripsi │ Tiket│  │ □ VIP   Rp 500rb   │  │
│         │ Layout  │ Q&A  │  │ □ VVIP  Rp 750rb   │  │
│                          │  │ ─────────────────  │  │
│  SEAT MAP PREVIEW        │  │ ❤ Tambah Wishlist  │  │
│  (interaktif jika login) │  └────────────────────┘  │
└──────────────────────────┴──────────────────────────┘
```

**Interaksi:**
- Seat map menampilkan kursi real-time via WS `/ws/seats`
- Jika event `CANCELLED` → CTA diganti "Event Dibatalkan" + info refund
- Jika `SOLD_OUT` → CTA disabled + badge merah "Tiket Habis"
- Share button: copy link, WhatsApp, Twitter

---

### 9.3 Checkout Step 1 — Pilih Tiket & Kursi

```
┌─────────────────────────────────────────────────────┐
│  STEPPER: [1 Pilih Tiket] ──── [2 Pembayaran]       │
├─────────────────────────────────────────────────────┤
│  RINGKASAN EVENT (mini card)                        │
├─────────────────────────────────────────────────────┤
│  PILIH TIPE TIKET                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │ ○ Regular    Rp 150.000   [−] 2 [+]  Rp 300rb│   │
│  │ ○ VIP        Rp 500.000   [−] 0 [+]          │   │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  SEAT MAP (jika event punya layout)                 │
│  [canvas interaktif — lihat SeatMapComponent]       │
├─────────────────────────────────────────────────────┤
│  SUBTOTAL: Rp 300.000                               │
│  [Lanjut ke Pembayaran →]                           │
└─────────────────────────────────────────────────────┘
```

**Validasi:**
- Max total tiket = 5 per user per acara (BR-TKT-002)
- Jika qty melebihi — tampilkan toast error `USER_QUOTA_EXCEEDED`
- Jika kursi sudah diambil saat submit — tampilkan `SEAT_LOCKED`

---

### 9.4 Checkout Step 2 — Pembayaran

```
┌─────────────────────────────────────────────────────┐
│  STEPPER: [✓ Pilih Tiket] ──── [2 Pembayaran]       │
├─────────────────────────────────────────────────────┤
│  RINGKASAN ORDER                                    │
│  Event: Konser Akhir Tahun                          │
│  2× Regular             Rp 300.000                  │
│  Platform fee (3%)      Rp   9.000                  │
│  ─────────────────────────────────                  │
│  Total                  Rp 309.000                  │
├─────────────────────────────────────────────────────┤
│  PILIH METODE PEMBAYARAN                            │
│  ○ Transfer Bank (VA) — BCA / Mandiri / BNI         │
│  ○ E-Wallet — GoPay / OVO / DANA                    │
│  ○ Kartu Kredit/Debit                               │
├─────────────────────────────────────────────────────┤
│  COUNTDOWN: 09:47 (sisa waktu)                      │
│  [Bayar Sekarang]                                   │
└─────────────────────────────────────────────────────┘
```

**Interaksi:**
- Timer mulai dari saat order dibuat (BR-PAY-001)
- WS `/ws/payments` listener aktif — auto-redirect saat payment sukses/gagal
- Saat VA dipilih: tampilkan nomor VA + instruksi bank (modal/accordion)
- Saat timer habis: redirect ke halaman expired dengan opsi buat order baru

---

### 9.5 Dashboard EO — Live

```
┌─────────────────────────────────────────────────────┐
│  HEADER: "Konser Akhir Tahun" | Status: ONGOING 🟢  │
├────────────┬────────────┬────────────┬──────────────┤
│ CHECK-IN   │ TIKET SOLD │ REVENUE    │ KAPASITAS    │
│ 1.247      │ 1.892      │ Rp 284jt   │ 92%          │
│ / 2.000    │ / 2.000    │            │ ██████████░  │
├─────────────────────────────────────────────────────┤
│  ACTIVITY FEED (real-time)                          │
│  🟢 14:32 — Budi S. check-in (kursi A-12)          │
│  🟢 14:31 — Ani W. check-in (kursi B-05)           │
│  🔵 14:30 — Order baru: 2 tiket Regular             │
├─────────────────────────────────────────────────────┤
│  [🔍 Scan Tiket]   [📊 Lihat Laporan]              │
└─────────────────────────────────────────────────────┘
```

**Interaksi:**
- Semua angka update real-time via WS `/ws/organizer`
- Kapasitas bar berubah warna: hijau → kuning (<30%) → merah (<10%)
- Notifikasi popup saat `CAPACITY_WARNING` (stok < 10%)
- Tombol "Scan Tiket" buka modal kamera atau input QR manual

---

### 9.6 Form Buat Event (Multi-step)

```
STEPPER: [1 Info] → [2 Venue] → [3 Tiket] → [4 Review]

Step 1 — Informasi Dasar:
  ─ Upload Banner (drag & drop, 16:9, max 5MB)
  ─ Judul Acara *
  ─ Kategori (dropdown: Musik, Seminar, Sport, ...)
  ─ Deskripsi (rich text editor — PrimeEditor)
  ─ Tag (opsional)
  Auto-save setiap 2 mnt → badge "Tersimpan otomatis 14:32"

Step 2 — Venue & Jadwal:
  ─ Tipe: ○ Fisik  ○ Online
  [Jika Fisik]
  ─ Nama Venue * | Kota *
  ─ Alamat Lengkap * | Koordinat (map picker)
  ─ Kapasitas Venue *
  [Jika Online]
  ─ Link Streaming *
  ─ Tanggal Mulai * | Tanggal Selesai *
  Validasi: start_at > sekarang, end_at > start_at

Step 3 — Tipe Tiket:
  ─ [+ Tambah Tipe Tiket]
  ┌─────────────────────────────────────────────────┐
  │ Nama: Regular          Harga: Rp [150.000]      │
  │ Kuota: [500]           Maks/orang: [5]          │
  │ Jual dari: [tgl]  s/d: [tgl]    [🗑]            │
  └─────────────────────────────────────────────────┘
  Validasi: total kuota ≤ kapasitas + 5% (BR-ORG-002)

Step 4 — Review:
  ─ Preview tampilan event card
  ─ Checklist kelengkapan
  ─ [Simpan Draft]  [Publikasikan Sekarang]
```

---

## 10. Error States & Empty States

| Kondisi | Tampilan |
|---|---|
| Event tidak ditemukan | Ilustrasi + "Acara tidak ditemukan" + tombol kembali |
| List event kosong (filter aktif) | "Tidak ada acara untuk filter ini" + tombol reset filter |
| Tiket habis | Badge merah di card + CTA diganti "Tiket Habis" |
| Akun terkunci (BR-AUTH-002) | Alert merah "Akun dikunci. Coba lagi dalam 14:32" + countdown |
| Pembayaran expired | Halaman dengan ilustrasi + "Waktu habis. Buat pesanan baru?" |
| WS disconnect | Toast bawah "Koneksi terputus — mencoba menghubungkan kembali..." + indicator |
| Network error umum | Toast "Gagal memuat data. Periksa koneksi internet." + retry button |

---

## 11. Navigasi & Routing

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '',
    loadChildren: () => import('./features/events/events.routes') },

  { path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes') },

  { path: 'checkout',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkout/checkout.routes') },

  { path: 'me',
    canActivate: [authGuard],
    loadChildren: () => import('./features/account/account.routes') },

  { path: 'organizer',
    canActivate: [authGuard, roleGuard('ORGANIZER')],
    loadChildren: () => import('./features/organizer/organizer.routes') },

  { path: '**', redirectTo: '' },
];
```

**Guards:**
- `authGuard` — redirect ke `/auth/login` jika tidak ada token
- `roleGuard('ORGANIZER')` — redirect ke `/` jika role bukan ORGANIZER
- `verifiedGuard` — redirect ke `/auth/verify-email` jika belum verifikasi email

---

## 12. Aksesibilitas & Performance

| Area | Target |
|---|---|
| Lighthouse Performance | ≥ 85 (mobile) |
| LCP | < 2.5s |
| CLS | < 0.1 |
| Keyboard navigation | Semua interaktif element reachable |
| ARIA label | Semua icon-only button, form field, status badge |
| Image lazy load | `loading="lazy"` semua banner event di listing |
| Bundle size | Lazy load per feature route, shared chunk < 200KB |
| Font | `font-display: swap`, preload Inter |

---

## 13. Referensi API Lengkap

Lihat dokumen backend:
- Auth: `references/01_auth.md`
- Event & EO: `references/02_organizer.md`
- Ticketing: `references/03_ticketing.md`
- Payment: `references/04_payment.md`
- Global conventions, error codes, WebSocket: `references/00_index.md`
