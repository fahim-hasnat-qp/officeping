# OfficePing

A warm, fast, frictionless internal office request system. Staff receive instant push notifications the moment a request comes in and can accept or reject directly from the notification. Requesters see live status updates in real time.

![OfficePing](apps/web/public/icon-192.png)

---

## Features

### For Members (Employees)
- **Send requests** — describe what you need with a category (tea, snacks, supplies, parcels, etc.)
- **Quick re-send** — save any request as a label and re-send it in one tap
- **Default breakfast** — set your usual breakfast order in your profile; load it into the meals form with one tap
- **Live status tracking** — see your request move through Pending → Accepted → In Progress → Done in real time, no refresh needed
- **Request notes** — add short notes to an active request (e.g. "no sugar please"); staff see them instantly
- **Compliment staff** — after delivery, send a compliment to the staff member who helped you
- **Meals** — order breakfast and lunch separately; orders lock after the daily cutoff time
- **In-app notifications** — stackable toast notifications with sound and haptic feedback for every status change

### For Staff
- **Live request feed** — new requests appear instantly on the home screen
- **Accept / Reject from push notification** — actionable OS notification buttons that open the request directly for one-tap action
- **Request management** — accept, start, complete, or cancel requests; add delay reasons
- **Meals dashboard** — see all breakfast and lunch orders for the day at a glance
- **Compliment feed** — live feed of compliments received; appears on home screen in real time
- **Request notes** — communicate with the requester directly on the request

### For Admins
- **Category management** — create and edit request categories with icons and descriptions
- **Staff management** — promote members to staff or admin roles
- **Statistics dashboard** — requests by category, staff performance, daily totals
- **Same member UI** — admins are employees too and use the same home screen for their own requests

### System-wide
- **PWA** — installable on Android and iOS, works offline for cached content
- **Push notifications** — Web Push (VAPID) for background/device notifications when the app is closed
- **Real-time updates** — Socket.IO for instant in-app updates and foreground notifications
- **Dual notification strategy** — Socket.IO handles foreground, Web Push handles background; both fire for every relevant event
- **Redis caching** — meals, stats, categories, settings, and compliment feed cached with appropriate TTLs; graceful degradation if Redis is unavailable
- **Demo mode** — no Google OAuth required; seeded demo accounts for judging/testing

---

## Architecture

```
┌─────────────┐     HTTPS / WS      ┌──────────────────────────────────────┐
│   Browser   │ ◄──────────────────► │           nginx (gateway)            │
│  (PWA/SPA)  │                      │  :80  →  /api/*  → backend:3000      │
└─────────────┘                      │         /socket.io/* → backend:3000  │
      │                              │         /*          → web:80          │
      │ Web Push                     └──────────────────────────────────────┘
      ▼                                         │              │
┌──────────────┐                       ┌────────┴───┐   ┌─────┴──────┐
│  FCM / APNS  │                       │  Backend   │   │   Web SPA  │
│  (Google /   │                       │  NestJS    │   │  React +   │
│   Apple)     │                       │  :3000     │   │  Vite PWA  │
└──────────────┘                       └────────────┘   └────────────┘
                                            │    │
                                    ┌───────┘    └────────┐
                                    ▼                      ▼
                             ┌────────────┐        ┌────────────┐
                             │ PostgreSQL │        │   Redis    │
                             │    :5432   │        │   :6379    │
                             └────────────┘        └────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| State management | Zustand |
| Routing | React Router v6 |
| PWA | vite-plugin-pwa (Workbox, injectManifest strategy) |
| Real-time (foreground) | Socket.IO client |
| Push notifications (background) | Web Push API + VAPID |
| Backend | NestJS 10, TypeScript |
| Database | PostgreSQL 15 + TypeORM (migrations) |
| Cache | Redis 7 (ioredis), graceful degradation |
| Real-time (server) | Socket.IO via `@nestjs/websockets` |
| Auth | Google OAuth 2.0 + JWT (httpOnly cookie) |
| Monorepo | pnpm workspaces |
| Shared types | `@officeping/shared` — TypeScript types/enums shared across frontend and backend |
| Container | Docker + Docker Compose |
| Reverse proxy | nginx (routes API, WebSocket, and static SPA) |

### Caching Strategy

| Resource | Strategy | TTL |
|---|---|---|
| Meals (breakfast/lunch) | Read-through, invalidate on status change | End of day (UTC midnight) |
| Categories | Write-through (del on create/update) | End of day |
| Settings | Write-through | End of day |
| Stats (admin) | TTL cache | 30 seconds |
| Stats by category | TTL cache | 5 minutes |
| Staff performance | TTL cache | 5 minutes |
| Compliment feed | Append-through (listPush on create) | End of day |

### Notification Architecture

```
Request created
      │
      ├── Socket.IO → staff rooms (instant, foreground)
      │        └── useNotifications hook → NotificationStack toast + sound + vibration
      │
      └── Web Push → staff push subscriptions (background, device-level)
               └── Service Worker
                     ├── App open  → postMessage to page + show OS notification
                     └── App closed → OS notification with Accept / Reject action buttons
                                           └── action click → opens request detail page
```

---

## Running with Docker

### Prerequisites
- Docker and Docker Compose v2

### Quick start

```bash
git clone https://github.com/fahim-hasnat-qp/officeping.git
cd officeping
docker compose up --build
```

Open `https://localhost`, accept the self-signed certificate warning once, and click **Demo Login**. No configuration needed — the repo includes a ready-to-use `.env` with VAPID keys, demo accounts, and HTTPS configured.

### Demo accounts

| Role | Login as |
|---|---|
| Member | Demo Login → Alex Member |
| Staff | Demo Login → Sam Staff |
| Admin | Demo Login → Admin User |

### Push notifications on a physical device

Chrome on Android (and all browsers on iOS) block PWA install and Web Push on self-signed certificates — even if you tap "proceed anyway". To test push notifications and install the PWA on a real device you need a trusted HTTPS URL, which requires tunneling.

**Cloudflare Tunnel (recommended — free, no account needed):**

```bash
# Install once
brew install cloudflared   # macOS
# or: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Run while docker compose is up — point at the nginx gateway
cloudflared tunnel --url https://localhost:443 --no-tls-verify
```

Cloudflare prints a URL like `https://random-words.trycloudflare.com`. Open that URL on your phone — push notifications and PWA install will work.

> **Note:** The tunnel must stay running in a separate terminal while you test. Stop it with `Ctrl+C` when done.

**ngrok (alternative):**

```bash
ngrok http https://localhost:443 --host-header=localhost
```

### Useful Docker commands

```bash
# Start in detached mode
docker compose up -d --build

# View logs
docker compose logs -f backend

# Stop (next up starts completely fresh)
docker compose down
```

> **Fresh on every start:** PostgreSQL and Redis use `tmpfs` (RAM-only). Every `docker compose up` starts from a clean database — migrations run automatically, demo seed re-inserts.

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 10 (`npm i -g pnpm@10`)
- PostgreSQL 15
- Redis 7 (or `docker compose up redis postgres` to start only the infra)

### Setup

```bash
# Install dependencies
pnpm install

# Build the shared package first
pnpm --filter @officeping/shared build

# Copy the root .env for local backend use
cp .env apps/backend/.env
# Edit apps/backend/.env — change DATABASE_URL and REDIS_URL to localhost

# Run database migrations
pnpm --filter @officeping/backend migration:run

# Start backend (port 3000) and frontend (port 5173) in separate terminals
pnpm dev:backend
pnpm dev:web
```

Frontend dev server proxies `/api` and `/socket.io` to `localhost:3000` via Vite's proxy config, so no CORS setup is needed in development.

### Project structure

```
officeping/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (auth, requests, meals, push, socket, …)
│   │   │   ├── entities/ # TypeORM entities
│   │   │   ├── migrations/
│   │   │   └── common/   # CacheService, mappers, guards
│   │   └── Dockerfile
│   └── web/              # React SPA / PWA
│       ├── src/
│       │   ├── pages/    # Route-level components
│       │   ├── components/
│       │   ├── hooks/    # useSocket, useNotifications, useLiveCount, …
│       │   ├── store/    # Zustand stores (auth, requests, notifications, …)
│       │   ├── lib/      # socket.ts, push.ts, api.ts
│       │   └── sw.ts     # Service worker (Workbox + push handler)
│       └── Dockerfile
├── packages/
│   └── shared/           # @officeping/shared — types, enums, DTOs shared by both apps
├── docker-compose.yml
├── nginx.conf
└── .env
```
