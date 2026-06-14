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
- **Accept / Reject from push notification** — actionable OS notification buttons; no need to open the app
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
                     ├── App open  → postMessage to page (already handled by socket)
                     └── App closed → OS notification with Accept / Reject action buttons
                                           └── action click → PATCH /api/requests/:id/status
```

---

## Running with Docker

### Prerequisites
- Docker and Docker Compose v2
- A Google Cloud OAuth 2.0 Web Client ID (optional — see Demo Mode below)

### Quick start

```bash
# 1. Clone the repo
git clone https://github.com/fahimhasnat/officeping.git
cd officeping

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set GOOGLE_CLIENT_ID or leave DEMO_MODE=true

# 3. Build and start everything
docker compose up --build

# App is now running at https://localhost
# (accept the self-signed certificate warning in your browser once)
```

That's it. Docker Compose starts PostgreSQL, Redis, the NestJS backend (with automatic migrations on startup), the React frontend, and nginx as the gateway — all in one command.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes (or Demo Mode) | — | Google OAuth 2.0 Web Client ID |
| `ALLOWED_EMAIL_DOMAIN` | No | `questionpro.com` | Only emails from this domain can log in |
| `ADMIN_EMAILS` | No | — | Comma-separated emails to seed as admin on first login |
| `JWT_SECRET` | Yes (production) | `dev_secret_change_me` | Random string, min 32 chars |
| `DB_USER` | No | `officeping` | PostgreSQL username |
| `DB_PASSWORD` | No | `officeping` | PostgreSQL password |
| `DB_NAME` | No | `officeping` | PostgreSQL database name |
| `DEMO_MODE` | No | `true` | Enables `/auth/demo-login` with seeded demo accounts |
| `VAPID_PUBLIC_KEY` | No | — | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | No | — | VAPID private key for Web Push |
| `VAPID_SUBJECT` | No | `mailto:admin@officeping.local` | VAPID contact URI |
| `API_BASE_URL` | No | `http://localhost` | Public base URL (used in push notification action callbacks) |
| `WEB_ORIGIN` | No | `http://localhost` | Frontend origin for CORS |

### Demo Mode

With `DEMO_MODE=true` (the default), the login page shows a **Demo Login** button that creates/returns pre-seeded accounts without Google OAuth:

| Role | Name | Notes |
|---|---|---|
| Member | Alex Member | Regular employee account |
| Staff | Sam Staff | Can accept and manage requests |
| Admin | Admin User | Has access to the Manage page |

### Generating VAPID keys for push notifications

Web Push notifications require VAPID keys. Generate a pair:

```bash
npx web-push generate-vapid-keys
```

Copy the output into your `.env`:
```
VAPID_PUBLIC_KEY=<your public key>
VAPID_PRIVATE_KEY=<your private key>
```

> **Note:** The Docker setup serves HTTPS on port 443 with a self-signed certificate (generated at build time). Browsers will show a security warning — click "Advanced → Proceed" once and push notifications will work. For testing on a physical device on the same network, access via `https://<your-machine-ip>` and accept the cert on the device too.

### Useful Docker commands

```bash
# Start in detached mode
docker compose up -d --build

# View logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Stop everything (next up will start completely fresh)
docker compose down

# Rebuild a single service after code changes
docker compose build backend && docker compose up -d backend
```

> **Fresh on every start:** PostgreSQL and Redis use `tmpfs` (RAM-only storage), so all data is wiped the moment containers stop. Every `docker compose up` starts from a clean database — migrations run automatically and demo seed data is re-inserted.

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

# Copy env files
cp .env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
# Edit both files with your values

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
└── .env.example
```
