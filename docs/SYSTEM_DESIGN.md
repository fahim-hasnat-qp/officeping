# OfficePing — System Design & Architecture

> Monorepo system architecture for NestJS backend + React Vite PWA
> Generated: June 12, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Technology Stack Detail](#3-technology-stack-detail)
4. [Data Models](#4-data-models)
5. [API Contract](#5-api-contract)
6. [Real-time Communication](#6-real-time-communication)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Deployment & Docker Compose](#8-deployment--docker-compose)
9. [Service Specifications](#9-service-specifications)
10. [Development Workflow](#10-development-workflow)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PWA Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React + Vite (Port 5173)                           │  │
│  │  ├─ Service Worker (Push notifications)             │  │
│  │  ├─ Socket.io Client                                │  │
│  │  └─ Web Push API Integration                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ↕  HTTP/WebSocket                                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Gateway / Nginx (Port 80, 443)                 │  │
│  │  ├─ Static PWA assets                               │  │
│  │  └─ Reverse proxy to backend                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ↕  HTTP/WebSocket                                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend Service Layer                               │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  NestJS (Port 3000)                         │   │  │
│  │  │  ├─ Request Module (CRUD, real-time sync)   │   │  │
│  │  │  ├─ Meals Module (breakfast/lunch)          │   │  │
│  │  │  ├─ Compliments Module                      │   │  │
│  │  │  ├─ Staff Module (availability, perf)       │   │  │
│  │  │  ├─ Push Service (VAPID, Web Push API)      │   │  │
│  │  │  ├─ Socket.io Namespace Handlers             │   │  │
│  │  │  └─ Auth Module (JWT)                        │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                    ↕ Database Driver                  │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  PostgreSQL (Port 5432)                     │   │  │
│  │  │  ├─ users, requests, meals, compliments    │   │  │
│  │  │  ├─ categories, notifications               │   │  │
│  │  │  └─ staff_availability                      │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Principles:**
- **Separation of Concerns:** Backend handles all business logic; frontend is presentation + client-side state
- **Real-time Sync:** Socket.io for instant notifications & status updates
- **Push Notifications:** Web Push API for offline-capable push to mobile devices
- **Stateless Backend:** All state in PostgreSQL; NestJS instances are interchangeable
- **PWA-First:** Client works offline with service worker caching

---

## 2. Monorepo Structure

```
officeping/
├── docs/
│   ├── PRD.md                          # Product requirements
│   └── SYSTEM_DESIGN.md                # This file
├── docker-compose.yml                  # Single-command deployment
├── nginx.conf                          # Reverse proxy config
├── package.json                        # Monorepo root
├── turbo.json                          # Turborepo config
│
├── apps/
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts                 # Entry point
│   │   │   ├── app.module.ts           # Root module
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/               # Google OAuth verify, JWT issuance
│   │   │   │   ├── requests/           # Request CRUD, real-time
│   │   │   │   ├── meals/              # Breakfast, lunch confirmations
│   │   │   │   ├── compliments/        # Appreciation system
│   │   │   │   ├── staff/              # Staff profiles, availability
│   │   │   │   ├── admin/              # Analytics, people management
│   │   │   │   ├── push/               # Push notification service
│   │   │   │   ├── socket/             # Socket.io handlers
│   │   │   │   └── category/           # Request categories
│   │   │   │
│   │   │   ├── entities/               # TypeORM entities
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── request.entity.ts
│   │   │   │   ├── breakfast.entity.ts
│   │   │   │   ├── lunch.entity.ts
│   │   │   │   ├── compliment.entity.ts
│   │   │   │   ├── request_note.entity.ts
│   │   │   │   ├── category.entity.ts
│   │   │   │   ├── notification.entity.ts
│   │   │   │   └── staff_availability.entity.ts
│   │   │   │
│   │   │   ├── dto/                    # Data transfer objects
│   │   │   │   ├── create-request.dto.ts
│   │   │   │   ├── update-request.dto.ts
│   │   │   │   └── ... (other DTOs)
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/            # Exception filters
│   │   │   │   ├── guards/             # Auth guards
│   │   │   │   └── pipes/              # Validation pipes
│   │   │   │
│   │   │   └── config/
│   │   │       ├── database.config.ts
│   │   │       ├── jwt.config.ts
│   │   │       ├── push.config.ts      # VAPID keys
│   │   │       └── env.ts
│   │   │
│   │   ├── test/                       # Integration tests
│   │   ├── .env.example                # Environment template
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── nest-cli.json
│   │
│   └── web/
│       ├── src/
│       │   ├── main.tsx                # Entry point
│       │   ├── App.tsx                 # Root component
│       │   │
│       │   ├── pages/                  # Page components
│       │   │   ├── Home.tsx
│       │   │   ├── NewRequest.tsx
│       │   │   ├── Meals.tsx
│       │   │   ├── RequestsStaff.tsx
│       │   │   ├── MealsStaff.tsx
│       │   │   ├── Admin/
│       │   │   │   └── Manage.tsx
│       │   │   └── Login.tsx
│       │   │
│       │   ├── components/
│       │   │   ├── Layout/
│       │   │   │   ├── TabBar.tsx
│       │   │   │   └── Header.tsx
│       │   │   ├── Cards/
│       │   │   │   ├── RequestCard.tsx (user + staff variants)
│       │   │   │   ├── QuickSendCard.tsx
│       │   │   │   └── ComplimentCard.tsx
│       │   │   ├── Forms/
│       │   │   │   ├── NewRequestForm.tsx
│       │   │   │   ├── BreakfastForm.tsx
│       │   │   │   └── LunchForm.tsx
│       │   │   └── Admin/
│       │   │       ├── StatsGrid.tsx
│       │   │       ├── CategoryChart.tsx
│       │   │       └── PeopleManagement.tsx
│       │   │
│       │   ├── services/
│       │   │   ├── api.ts              # HTTP client
│       │   │   ├── socket.ts           # Socket.io client
│       │   │   ├── push.ts             # Push notification registration
│       │   │   └── auth.ts             # Auth utilities
│       │   │
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useRequest.ts
│       │   │   ├── useSocket.ts
│       │   │   ├── usePush.ts          # For VAPID subscription
│       │   │   └── useRole.ts
│       │   │
│       │   ├── store/
│       │   │   ├── authStore.ts        # Zustand or Redux
│       │   │   ├── requestStore.ts
│       │   │   └── uiStore.ts
│       │   │
│       │   ├── utils/
│       │   │   ├── format.ts
│       │   │   ├── time.ts
│       │   │   └── constants.ts
│       │   │
│       │   ├── styles/
│       │   │   ├── globals.css         # Design system tokens
│       │   │   ├── colors.css          # Gold, ink, surface tokens
│       │   │   └── components.css
│       │   │
│       │   ├── public/
│       │   │   ├── service-worker.ts   # Service worker (PWA)
│       │   │   ├── manifest.json       # PWA manifest
│       │   │   ├── icon-192.png
│       │   │   └── icon-512.png
│       │   │
│       │   └── App.css
│       │
│       ├── index.html                  # Vite HTML template
│       ├── vite.config.ts              # Vite + PWA plugin config
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js          # Optional: Tailwind CSS
│       └── postcss.config.js
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/                  # Shared TypeScript types
│       │   │   ├── request.ts
│       │   │   ├── user.ts
│       │   │   ├── meal.ts
│       │   │   └── socket-events.ts
│       │   │
│       │   ├── constants/
│       │   │   ├── roles.ts
│       │   │   ├── request-status.ts
│       │   │   └── categories.ts
│       │   │
│       │   └── utils/
│       │       ├── validators.ts
│       │       └── formatters.ts
│       │
│       ├── package.json
│       └── tsconfig.json
│
└── .gitignore
```

---

## 3. Technology Stack Detail

### Backend (NestJS)

**Why NestJS?**
- Enterprise-grade framework with built-in dependency injection
- Excellent TypeORM integration for PostgreSQL
- First-class support for WebSockets (Socket.io)
- Decorator-based approach = fast development
- Production-ready error handling & logging

**Key Dependencies:**
```json
{
  "@nestjs/core": "^10.x",
  "@nestjs/common": "^10.x",
  "@nestjs/typeorm": "^10.x",
  "@nestjs/jwt": "^11.x",
  "@nestjs/websockets": "^10.x",
  "typeorm": "^0.3.x",
  "socket.io": "^4.7.x",
  "pg": "^8.x",
  "web-push": "^3.6.x",
  "google-auth-library": "^9.x",
  "class-validator": "^0.14.x"
}
```

### Frontend (React + Vite)

**Why Vite + React?**
- Lightning-fast dev server (HMR instant reload)
- Fast PWA builds & asset optimization
- Minimal config overhead for hackathon timeline
- Excellent TypeScript support out of the box

**Key Dependencies:**
```json
{
  "react": "^18.2.x",
  "react-dom": "^18.2.x",
  "vite": "^5.x",
  "@vitejs/plugin-react": "^4.x",
  "vite-plugin-pwa": "^0.17.x",
  "axios": "^1.6.x",
  "socket.io-client": "^4.7.x",
  "zustand": "^4.x",
  "tailwindcss": "^3.x",
  "typescript": "^5.x"
}
```

### Database (PostgreSQL)

**Why PostgreSQL?**
- ACID compliance for financial/request data integrity
- JSONB columns for flexible meal orders
- Native UUID support
- Clean Docker Compose setup
- Excellent TypeORM support

**Key Tables:**
- `users` (id, email, google_id, name, avatar_url, role, is_online, created_at)
- `requests` (id, creator_id, staff_id, category_id, status, description, location, created_at, completed_at)
- `breakfast` (id, user_id, order, status, cutoff_time, date)
- `lunch` (id, user_id, attending, date)
- `compliments` (id, from_user_id, to_staff_id, message, created_at)
- `request_notes` (id, request_id, author_id, message, created_at)
- `categories` (id, name, icon, created_at)
- `push_subscriptions` (id, user_id, endpoint, auth, p256dh)
- `staff_availability` (id, staff_id, status, updated_at)

### Real-time & Push

**Socket.io Namespaces:**
- `/requests` — staff listens for new incoming requests
- `/request/:id` — requester & staff listen for status updates
- `/staff` — admin dashboard live updates

> Note: in-request communication is **not** chat over sockets. Requester ↔ staff notes are plain REST resources (`POST /requests/:id/notes`) delivered via Web Push — see [Request Notes](#request-notes-not-chat) below.

**Web Push API:**
- VAPID keys pre-generated and stored in `.env`
- Service Worker handles incoming push events
- Staff receives actionable notifications (Accept/Delay buttons — Android/Chrome only; iOS doesn't support notification actions, tap opens the app deep-linked to the request)
- iOS support (16.4+): background delivery works, but the PWA must be installed to the Home Screen, permission must be requested from a user gesture, and every push must display a visible notification (no silent push)

---

## 4. Data Models

### User Entity

```typescript
// apps/backend/src/entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  googleId: string | null; // Google `sub` claim — null until first sign-in (pre-provisioned rows)

  @Column({ nullable: true })
  avatarUrl: string | null; // From Google profile

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  role: UserRole; // MEMBER | STAFF | ADMIN

  @Column({ default: false })
  isOnline: boolean; // Staff status

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Request, r => r.requester)
  requestsCreated: Request[];

  @OneToMany(() => Request, r => r.staff)
  requestsAssigned: Request[];

  @OneToMany(() => Compliment, c => c.fromUser)
  complimentsSent: Compliment[];

  @OneToMany(() => Compliment, c => c.toStaff)
  complimentsReceived: Compliment[];
}

enum UserRole {
  MEMBER = 'member',
  STAFF = 'staff',
  ADMIN = 'admin',
}
```

### Request Entity

```typescript
@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, u => u.requestsCreated)
  requester: User;

  @Column()
  requesterId: string;

  @ManyToOne(() => User, u => u.requestsAssigned, { nullable: true })
  staff: User;

  @Column({ nullable: true })
  staffId: string;

  @ManyToOne(() => Category)
  category: Category;

  @Column()
  categoryId: string;

  @Column()
  description: string;

  @Column()
  location: string;

  @Column({ type: 'enum', enum: RequestStatus })
  status: RequestStatus; // PENDING | ACCEPTED | IN_PROGRESS | DONE | CANCELLED

  @Column({ nullable: true })
  cancelReason: string;

  @Column({ nullable: true })
  delayReason: string;

  @Column({ default: false })
  isSavedRequest: boolean; // Quick send template?

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  acceptedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  // Relations
  @OneToMany(() => Notification, n => n.request, { cascade: true })
  notifications: Notification[];
}

enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}
```

### Breakfast & Lunch Entities

```typescript
@Entity('breakfast')
export class Breakfast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  order: string; // Custom order, e.g. "Paratha + egg, no chili"

  @Column({ type: 'enum', enum: MealStatus })
  status: MealStatus; // PENDING | CONFIRMED | SERVED

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('lunch')
export class Lunch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  attending: boolean; // Yes/No toggle

  @CreateDateColumn()
  createdAt: Date;
}

enum MealStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SERVED = 'served',
}
```

### Compliment Entity

```typescript
@Entity('compliments')
export class Compliment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, u => u.complimentsSent)
  fromUser: User;

  @Column()
  fromUserId: string;

  @ManyToOne(() => User, u => u.complimentsReceived)
  toStaff: User;

  @Column()
  toStaffId: string;

  @ManyToOne(() => Request)
  request: Request;

  @Column()
  requestId: string;

  @Column()
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Request Note Entity

```typescript
@Entity('request_notes')
export class RequestNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Request, { onDelete: 'CASCADE' })
  request: Request;

  @Column()
  requestId: string;

  @ManyToOne(() => User)
  author: User;

  @Column()
  authorId: string;

  @Column()
  message: string; // e.g. "no sugar please"

  @CreateDateColumn()
  createdAt: Date;
}
```

### Push Subscription Entity

```typescript
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column()
  endpoint: string; // Web Push endpoint

  @Column({ type: 'jsonb' })
  keys: { auth: string; p256dh: string }; // VAPID keys

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 5. API Contract

### Authentication Endpoints

```
POST /auth/google
├─ Body: { idToken }  // Google ID token from Google Identity Services
├─ Verify: signature + audience via google-auth-library
├─ Authorize:
│  ├─ email domain = ALLOWED_EMAIL_DOMAIN → find-or-create as MEMBER (auto-provision)
│  ├─ email pre-provisioned by admin      → claim row (stamp googleId, name, avatarUrl)
│  └─ otherwise                            → 403 "Ask an admin to add you"
├─ Response: { accessToken, user: { id, email, name, role, avatarUrl } }
└─ Note: backend issues its own 7-day JWT; the Google token is verified once and discarded

POST /auth/demo-login  (only when DEMO_MODE=true)
├─ Body: { email }  // one of the seeded demo users
├─ Response: { accessToken, user }
└─ Note: demo/judging escape hatch — no Google dependency
```

### Request Endpoints (All require JWT)

```
POST /requests
├─ Body: { categoryId, description, location, isSavedRequest }
├─ Response: { id, status: 'PENDING', ... }
├─ Side effects: Staff receive push notification + Socket.io emit
└─ Authorization: MEMBER, STAFF, ADMIN

GET /requests
├─ Query: { status?, categoryId?, limit, offset }
├─ Response: [ Request[], meta: { total, limit, offset } ]
└─ Authorization: Own requests visible to MEMBER; all visible to STAFF/ADMIN

GET /requests/:id
├─ Response: Request + attached Compliment + notes timeline
└─ Authorization: Only requester, assigned staff, or ADMIN

POST /requests/:id/notes
├─ Body: { message }
├─ Response: { id, requestId, author: { id, name }, message, createdAt }
├─ Side effects: Web Push to the other party (requester ↔ assigned staff)
├─ Note: One-off note (e.g. "no sugar please") — not a chat session
└─ Authorization: Requester or assigned staff, while request is active

PATCH /requests/:id
├─ Body: { status }
├─ Allowed transitions:
│  ├─ PENDING → ACCEPTED (staff only)
│  ├─ PENDING → CANCELLED (requester + staff)
│  ├─ ACCEPTED → IN_PROGRESS (staff)
│  └─ IN_PROGRESS → DONE (staff)
├─ Side effects: Requester notified via Socket.io
└─ Authorization: Requester or assigned staff

POST /requests/:id/delay
├─ Body: { reason }
├─ Response: { status: 'DELAYED', reason }
├─ Side effects: Notification to requester
└─ Authorization: Assigned staff only

POST /requests/:id/cancel
├─ Body: { reason }
├─ Response: { status: 'CANCELLED', reason }
└─ Authorization: Requester or assigned staff

GET /requests/quick-send
├─ Response: [ SavedRequest[] ]
├─ Note: Requests where isSavedRequest = true
└─ Authorization: Own saved requests only
```

### Meals Endpoints

```
POST /meals/breakfast
├─ Body: { order, date }
├─ Response: { id, status: 'PENDING', ... }
└─ Authorization: MEMBER, STAFF, ADMIN

GET /meals/breakfast
├─ Query: { date? }
├─ Response: Breakfast[] for user (or all for STAFF viewing)
└─ Authorization: Own + STAFF can view all for the day

PATCH /meals/breakfast/:id
├─ Body: { status } (PENDING → CONFIRMED → SERVED)
├─ Response: Breakfast
└─ Authorization: STAFF can advance status

POST /meals/lunch
├─ Body: { attending, date }
├─ Response: { id, attending, ... }
└─ Authorization: MEMBER, STAFF, ADMIN

GET /meals/lunch
├─ Query: { date? }
├─ Response: Lunch[] (list of attendees for staff)
└─ Authorization: STAFF + ADMIN
```

### Compliments Endpoints

```
POST /compliments
├─ Body: { toStaffId, requestId, message }
├─ Response: { id, fromUser, toStaff, message, createdAt }
├─ Side effects: Broadcast to staff Socket.io room
└─ Authorization: MEMBER sending

GET /compliments
├─ Query: { toStaffId?, limit, offset }
├─ Response: Compliment[]
└─ Authorization: Own compliments + STAFF can view self

GET /compliments/feed (Staff Dashboard)
├─ Response: [ Compliment[] ] sorted by createdAt DESC (last 24h)
└─ Authorization: STAFF + ADMIN
```

### Admin Endpoints

```
GET /admin/stats
├─ Response: { totalRequests, completionRate, avgResponseTime, totalCompliments }
└─ Authorization: ADMIN only

GET /admin/stats/by-category
├─ Response: [ { categoryId, name, count } ]
└─ Authorization: ADMIN only

GET /admin/staff-performance
├─ Response: [ { staffId, name, completed, avgResponseTime, isOnline } ]
└─ Authorization: ADMIN only

GET /admin/users
├─ Response: User[]
└─ Authorization: ADMIN only

POST /admin/users
├─ Body: { email, name, role }
├─ Response: User (pre-provisioned — no googleId until first sign-in)
├─ Note: "Add person" — allowlists non-domain emails (staff personal Gmails)
└─ Authorization: ADMIN only

PATCH /admin/users/:id
├─ Body: { role }
├─ Response: User
└─ Authorization: ADMIN only

GET /admin/categories
├─ Response: Category[]
└─ Authorization: ADMIN only

POST /admin/categories
├─ Body: { name, icon }
├─ Response: Category
└─ Authorization: ADMIN only

PATCH /admin/categories/:id
├─ Body: { name?, icon? }
├─ Response: Category
└─ Authorization: ADMIN only
```

### Push Notification Endpoints

```
POST /push/subscribe
├─ Body: { subscription: { endpoint, keys: { auth, p256dh } } }
├─ Response: { success }
├─ Note: Client registers their push subscription
└─ Authorization: Any authenticated user

DELETE /push/unsubscribe
├─ Response: { success }
└─ Authorization: Own subscription only
```

---

## 6. Real-time Communication

### Socket.io Namespaces

**Connection Flow:**
```
Client connects to `/` → Auth via JWT token in query
├─ JWT decoded in Socket.io middleware
├─ User attached to socket object
└─ Socket joins user-specific rooms
```

**Namespaces & Events:**

#### `/requests` (Staff listening)
```typescript
// Backend emits (when new request created)
socket.emit('new_request', {
  id: string;
  category: string;
  description: string;
  requester: { name, location };
  createdAt: Date;
})

// Staff joins this namespace on Home screen
// Real-time incoming requests list
```

#### `/request/:id` (Requester + Staff)
```typescript
// When request status changes
socket.emit('status_update', {
  status: 'ACCEPTED' | 'IN_PROGRESS' | 'DONE';
  staffName?: string;
  acceptedAt?: Date;
})

// When staff adds delay notification
socket.emit('delay_notification', {
  reason: string;
  delayedUntil?: Date;
})

// When requester can see completed → offer compliment
socket.emit('request_completed', {
  staffId: string;
  staffName: string;
})
```

#### Request Notes (not chat)

Notes between requester and staff do **not** use Socket.io. A note is a REST resource delivered via Web Push, so it works whether the app is open, backgrounded, or closed:

```
1. Author sends note        → POST /requests/:id/notes (stored in request_notes)
2. Backend sends Web Push   → to the other party's push subscriptions
3. Service worker receives push:
   ├─ App open (clients.matchAll() finds a focused window)
   │    → postMessage note to the page → UI appends it to the notes timeline
   └─ App closed/backgrounded
        → showNotification("Note on your coffee request: no sugar please")
        → notificationclick opens the app deep-linked to /requests/:id
4. Request detail screen renders notes from GET /requests/:id
   (refetch on visibilitychange covers any missed updates)
```

Auto-delete: notes are removed 24h after request completion (daily cleanup job).

#### `/staff` (Admin dashboard)
```typescript
socket.emit('staff_status_update', {
  staffId: string;
  isOnline: boolean;
  updatedAt: Date;
})

socket.emit('compliment_broadcast', {
  staffName: string;
  complimentText: string;
  fromUser: string;
  timestamp: Date;
})
```

---

## 7. Authentication & Authorization

### JWT Strategy

**Token Structure:**
```typescript
{
  sub: string;      // user.id
  email: string;
  role: UserRole;   // MEMBER | STAFF | ADMIN
  iat: number;      // Issued at
  exp: number;      // Expires in 7 days
}
```

**Login Flow (Google OAuth):**
1. User taps "Sign in with Google" (Google Identity Services on the Login page)
2. Google returns an ID token to the frontend
3. Frontend → `POST /auth/google { idToken }`
4. Backend verifies the token (google-auth-library: signature, audience, expiry)
5. Provisioning check: company-domain email → auto-create MEMBER; pre-provisioned
   email (added by an admin on the Manage page — covers staff with personal Gmails) →
   claim the row; otherwise 403
6. Backend issues its own JWT (7-day expiry) with role embedded
7. Frontend stores it and sends it on every request header + Socket.io handshake (`auth.token`)

**Bootstrap:** on startup the backend idempotently ensures every email in `ADMIN_EMAILS`
exists as an ADMIN row (pre-provisioned; claimed on first Google login).

**Demo mode:** `DEMO_MODE=true` enables `POST /auth/demo-login` with seeded demo users
so the app runs without a Google OAuth client (judging escape hatch).

**Guards & Decorators:**

```typescript
// apps/backend/src/common/guards/auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    // Validate JWT
  }
}

// apps/backend/src/common/guards/role.guard.ts
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.includes(user.role);
  }
}

// Usage:
@Get('/requests')
@UseGuards(AuthGuard)
@Roles(UserRole.MEMBER, UserRole.STAFF, UserRole.ADMIN)
getRequests() { ... }
```

### Authorization Logic

**Request Creation:**
- Any authenticated user can create a request
- Assignment to staff is automatic (load-balanced or round-robin)

**Request Status Changes:**
- Requester can cancel at any time
- Only assigned staff can accept, delay, mark done
- Admin can override

**Admin Access:**
- Only ADMIN role can view `/admin/*` endpoints
- ADMIN role cannot be self-assigned (only other admins can promote)

**Data Visibility:**
- Members see only own requests & meals
- Staff see all requests assigned to them + all users' meals (for lunch/breakfast planning)
- Admin see everything

---

## 8. Deployment & Docker Compose

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: officeping-db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./apps/backend
    container_name: officeping-api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRY: 7d
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_SUBJECT: ${VAPID_SUBJECT}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run start:prod

  web:
    build:
      context: ./apps/web
      args:
        VITE_API_URL: http://localhost:3000
        VITE_VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
    container_name: officeping-web
    ports:
      - "5173:5173"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: officeping-gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./cert:/etc/nginx/cert:ro
    depends_on:
      - backend
      - web

volumes:
  postgres_data:
```

### Environment Variables (.env)

```bash
# Database
DB_USER=officeping
DB_PASSWORD=your_secure_password
DB_NAME=officeping

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# Google OAuth (Web client — authorized JS origins: http://localhost, http://localhost:5173)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
ALLOWED_EMAIL_DOMAIN=questionpro.com
ADMIN_EMAILS=admin@questionpro.com

# Demo mode — enables /auth/demo-login with seeded users (no Google needed)
DEMO_MODE=true

# VAPID (Web Push)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@officeping.local

# Frontend
VITE_API_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

**Generate VAPID Keys:**
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Startup Command

```bash
docker compose up --build
```

This spins up:
- PostgreSQL (port 5432)
- NestJS backend (port 3000)
- React frontend (port 5173)
- Nginx reverse proxy (ports 80, 443)

---

## 9. Service Specifications

### Backend Service (NestJS)

**Port:** 3000  
**Health Check:** `GET /health` → `{ status: 'ok' }`

**Core Modules:**

| Module | Responsibility |
|--------|---|
| `AuthModule` | JWT generation, login, invite flow |
| `RequestModule` | Request CRUD, status transitions, real-time sync |
| `MealsModule` | Breakfast orders, lunch confirmations |
| `ComplimentsModule` | Compliment creation, broadcast, feed |
| `StaffModule` | Staff profiles, online/offline status |
| `AdminModule` | Analytics, people mgmt, category mgmt |
| `PushModule` | VAPID subscription, push notifications |
| `SocketModule` | Socket.io gateway, real-time events |
| `CategoryModule` | Request categories, CRUD |

**Error Handling:**

```typescript
// apps/backend/src/common/filters/exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    
    if (exception instanceof BadRequestException) {
      response.status(400).json({ message: exception.message });
    } else if (exception instanceof UnauthorizedException) {
      response.status(401).json({ message: 'Unauthorized' });
    } else if (exception instanceof ForbiddenException) {
      response.status(403).json({ message: 'Forbidden' });
    } else {
      response.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
```

### Frontend Service (React + Vite)

**Port:** 5173 (dev) / 80 (prod via Nginx)  
**PWA Manifest:** `/public/manifest.json`

**Service Worker Responsibilities:**
- Cache static assets for offline access
- Handle incoming push notifications
- Intercept actionable notification clicks (Accept button)

**Client-side Store (Zustand):**

```typescript
// apps/web/src/store/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  login: (email, password) => { /* ... */ },
  logout: () => { /* ... */ },
}))

// apps/web/src/store/requestStore.ts
export const useRequestStore = create((set) => ({
  requests: [],
  activeRequest: null,
  quickSend: [],
  fetchRequests: () => { /* ... */ },
  createRequest: () => { /* ... */ },
}))
```

### PostgreSQL Service

**Port:** 5432  
**Volume:** `postgres_data` (persistent)

**Backup Strategy:**
```bash
docker exec officeping-db pg_dump -U officeping officeping > backup.sql
```

---

## 10. Development Workflow

### Local Setup

```bash
# 1. Clone & install dependencies
git clone <repo>
cd officeping
npm install

# 2. Generate VAPID keys
web-push generate-vapid-keys

# 3. Create .env file
cp .env.example .env
# Edit .env with VAPID keys and secrets

# 4. Run with Docker Compose (development)
docker compose up --build

# OR run locally without Docker for faster iteration:

# Terminal 1: Backend
cd apps/backend
npm run start:dev

# Terminal 2: Frontend
cd apps/web
npm run dev

# Terminal 3: PostgreSQL (Docker)
docker run --name officeping-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:15
```

### Monorepo Commands

```bash
# Build all packages
npm run build

# Lint all packages
npm run lint

# Test all packages
npm run test

# Format code
npm run format

# Turborepo caching (speeds up CI/CD)
npx turbo run build --cache
```

### Git Workflow

```bash
# Feature branch
git checkout -b feat/new-feature

# Commit with conventional commits
git commit -m "feat: add request delay notification"

# Push to main
git push origin feat/new-feature

# Create PR for review
```

### Testing Strategy

**Backend:**
- Unit tests: Services & DTOs (Jest)
- Integration tests: API endpoints (Supertest)
- Target: 70%+ coverage

**Frontend:**
- Component tests: Buttons, forms, cards (Vitest + React Testing Library)
- E2E tests: Full user flows (Playwright)
- Target: Critical paths covered

---

## Implementation Timeline (Hackathon)

| Phase | Duration | Focus |
|-------|----------|-------|
| **Day 1 (Thu)** | 8h | Project setup, entities, basic API |
| **Day 1 (Evening)** | 4h | Authentication, JWT flow |
| **Day 2 (Fri)** | 8h | Core request CRUD, Socket.io real-time |
| **Day 2 (Evening)** | 4h | Push notifications, Web Push API |
| **Day 3 (Sat)** | 8h | React UI (Home, New Request, Staff view) |
| **Day 3 (Evening)** | 4h | Meals system, compliments |
| **Day 4 (Sun, Final)** | 12h | Admin dashboard, polish, Docker Compose, demo prep |

**Checkpoint Demos:**
- After Phase 2: Authentication working, can log in
- After Phase 4: User can create request, staff gets push notification
- After Phase 6: UI looks good, all role-based screens render
- Final: Full flow demo with 5-minute video

---

*End of System Design Document*
