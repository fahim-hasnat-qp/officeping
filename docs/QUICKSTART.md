# OfficePing Monorepo Quick Start

## Tech Stack Summary

### Recommended (Your Plan) ✅
- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** React + Vite + PWA
- **Real-time:** Socket.io
- **Push:** Web Push API (VAPID)
- **Deployment:** Docker Compose
- **Monorepo Tool:** Turborepo or pnpm workspaces

### Why This Stack?

| Requirement | Solution | Why |
|---|---|---|
| PWA (Web + Android + iOS) | React + Vite + PWA plugin | Single codebase, fast builds, iOS 16.4+ support |
| Backend scalability | NestJS | Enterprise architecture, fast development |
| Real-time sync | Socket.io | Instant staff notifications & status updates |
| Push notifications | Web Push API | Works natively on Android, iOS PWA support |
| Database | PostgreSQL | ACID, JSON support, Docker-ready |
| Single command deploy | Docker Compose | Perfect for hackathon demo |

### Alternative Considerations (Not Recommended)

❌ **React Native** — Extra complexity, separate iOS/Android builds, slower for hackathon  
❌ **Next.js** — Slower dev cycles than Vite, overkill for PWA  
❌ **Flutter** — Non-JS ecosystem, learning curve  
❌ **Express** — Works but NestJS is more structured for this scale

---

## Monorepo Structure

```
officeping/                          # Root
├── apps/
│   ├── backend/                     # NestJS API (port 3000)
│   │   ├── src/modules/             # Organized by feature
│   │   ├── src/entities/            # TypeORM models
│   │   └── Dockerfile
│   └── web/                         # React Vite PWA (port 5173)
│       ├── src/pages/               # Route components
│       ├── src/components/          # Reusable components
│       ├── public/service-worker.ts # Service Worker
│       └── vite.config.ts           # PWA plugin config
├── packages/
│   └── shared/                      # Shared types & constants
│       └── src/types/               # TypeScript interfaces
├── docker-compose.yml               # Single command startup
└── docs/
    ├── PRD.md                       # Requirements
    └── SYSTEM_DESIGN.md             # Architecture (this repo's copy)
```

---

## Setup Commands

### 1. Initialize Monorepo

```bash
# Create root package.json
npm init -y

# Install Turborepo globally
npm install -g turbo

# Or use pnpm workspaces (faster)
npm install -g pnpm
pnpm install
```

### 2. Create Backend

```bash
# Generate NestJS project
npm i -g @nestjs/cli
nest new apps/backend
cd apps/backend
npm install typeorm pg @nestjs/typeorm @nestjs/jwt socket.io web-push
```

### 3. Create Frontend

```bash
# Generate Vite React project
npm create vite@latest apps/web -- --template react-ts
cd apps/web
npm install axios socket.io-client zustand vite-plugin-pwa
```

### 4. Create Shared Package

```bash
mkdir -p packages/shared/src/{types,constants,utils}
touch packages/shared/package.json packages/shared/tsconfig.json
```

### 5. Generate VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
# Store in .env for Docker Compose
```

### 6. Start Development

```bash
# Terminal 1: Backend
cd apps/backend && npm run start:dev

# Terminal 2: Frontend
cd apps/web && npm run dev

# Terminal 3: PostgreSQL (Docker)
docker run --name officeping-pg \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 \
  postgres:15
```

---

## Key API Patterns

### Request CRUD with Real-time Sync

```typescript
// Backend: Create request
@Post('/requests')
async create(@Body() dto: CreateRequestDto, @User() user: User) {
  const request = await this.requestService.create(dto, user);
  
  // Broadcast to all staff
  this.socket.emit('new_request', {
    id: request.id,
    category: request.category.name,
    requester: user.name,
  });
  
  return request;
}

// Frontend: Listen for new requests
socket.on('new_request', (data) => {
  showPushNotification(`New request from ${data.requester}`);
  addToList(data);
});
```

### Push Notification Setup

```typescript
// Backend: Send push to staff
async notifyStaff(request: Request) {
  const staffSubscriptions = await this.pushService.getSubscriptions(request.staffId);
  
  for (const sub of staffSubscriptions) {
    await webpush.sendNotification(sub, JSON.stringify({
      title: `New ${request.category.name} request`,
      body: `${request.requester.name} in ${request.location}`,
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'delay', title: 'Delay' },
      ],
    }));
  }
}

// Frontend: Register for push
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  }).then(sub => {
    fetch('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: sub }),
    });
  });
});
```

### Authentication Flow

```typescript
// Backend: Login endpoint
@Post('/auth/login')
async login(@Body() dto: LoginDto) {
  const user = await this.authService.validate(dto.email, dto.password);
  const token = this.jwtService.sign({ sub: user.id, role: user.role });
  return { accessToken: token, user };
}

// Frontend: Store & use token
const { accessToken } = await api.post('/auth/login', credentials);
localStorage.setItem('accessToken', accessToken);

// Attach to all requests
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Attach to Socket.io connection
socket.connect({ query: { token: accessToken } });
```

---

## Docker Compose Quick Start

```bash
# 1. Create .env file
echo "DB_USER=officeping" >> .env
echo "DB_PASSWORD=your_password" >> .env
echo "JWT_SECRET=your_secret" >> .env
echo "VAPID_PUBLIC_KEY=your_public_key" >> .env
echo "VAPID_PRIVATE_KEY=your_private_key" >> .env

# 2. Build and start all services
docker compose up --build

# 3. Frontend available at http://localhost
# 4. Backend API at http://localhost/api (via Nginx proxy)
```

---

## Critical PWA Setup

### Service Worker Registration (React)

```typescript
// apps/web/src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.ts')
      .then(reg => console.log('SW registered'))
      .catch(err => console.error('SW registration failed:', err));
  });
}
```

### Vite PWA Plugin

```typescript
// apps/web/vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        name: 'OfficePing',
        short_name: 'OfficePing',
        theme_color: '#1A1714',
        background_color: '#F7F5F1',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
})
```

---

## Testing Strategy

### Backend (Supertest + Jest)

```bash
npm run test  # Unit tests
npm run test:e2e  # Integration tests
```

### Frontend (Vitest + React Testing Library)

```bash
npm run test  # Component tests
npm run test:e2e  # Playwright E2E
```

---

## Debugging Tips

### Backend

```bash
# Enable debug logs
DEBUG=officeping:* npm run start:dev

# Check PostgreSQL connection
psql postgresql://officeping:password@localhost:5432/officeping

# Check Socket.io connections
curl http://localhost:3000/socket.io/?EIO=4&transport=polling
```

### Frontend

```bash
# React DevTools extension
# Redux DevTools for Zustand store inspection
# Chrome DevTools: Network tab for Socket.io frames
# PWA: DevTools > Application > Service Workers (check registration)
# PWA: DevTools > Application > Manifest (verify PWA-ready)
```

---

## Performance Checkpoints

- **Build time:** Frontend < 30s (Vite), Backend < 20s (NestJS)
- **Dev server:** Hot reload < 100ms (React)
- **API latency:** < 100ms for typical request
- **Push notification:** < 2s from creation to staff phone
- **Database query:** < 50ms average

---

## Next Steps

1. ✅ **Architecture**: System design complete (this document)
2. ⏭️ **Setup**: Initialize monorepo & install dependencies
3. ⏭️ **Entities**: Create all TypeORM entities
4. ⏭️ **API**: Build authentication & request endpoints
5. ⏭️ **Real-time**: Implement Socket.io & push notifications
6. ⏭️ **UI**: Build React components for all screens
7. ⏭️ **Integration**: Connect frontend to backend
8. ⏭️ **Polish**: Admin dashboard, error handling, docs
9. ⏭️ **Docker**: Test full Docker Compose setup
10. ⏭️ **Demo**: Record 5-min video, prepare for Monday 9 AM submission

---

*Estimated timeline: 3-4 days for full implementation with this architecture.*
