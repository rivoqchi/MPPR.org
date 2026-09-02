# PPR.org API

Enterprise real-time backend for PPR.org — built with NestJS v11, PostgreSQL, Redis, Socket.io, and BullMQ.

## Tech Stack

- **Framework:** NestJS v11 (TypeScript strict)
- **Database:** PostgreSQL 16 + Prisma ORM
- **Cache / Pub-Sub:** Redis 7
- **Real-time:** Socket.io + Redis Adapter (horizontal scaling)
- **Auth:** JWT (access + refresh token rotation)
- **Jobs:** BullMQ
- **Docs:** Swagger OpenAPI

## Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d postgres redis
```

Optional MinIO (file uploads):

```bash
docker compose up -d minio
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment

```bash
cp .env.example .env
```

### 4. Database migration & seed

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### 5. Run API (development)

```bash
pnpm start:dev
```

Or run everything via Docker (including API with hot reload):

```bash
docker compose up -d
```

## URLs

| Service   | URL                                      |
|-----------|------------------------------------------|
| API       | http://localhost:8000/api/v1             |
| Swagger   | http://localhost:8000/api/docs           |
| WebSocket | ws://localhost:8000/socket.io              |
| Health    | http://localhost:8000/api/v1/health      |

## Frontend Integration

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
```

## Auth Endpoints

| Method | Endpoint          | Description              |
|--------|-------------------|--------------------------|
| POST   | /auth/register    | Register new user        |
| POST   | /auth/login       | Login (access + refresh) |
| POST   | /auth/refresh     | Refresh access token     |
| POST   | /auth/logout      | Logout (Bearer required) |

### Seed Users

| Email           | Password    | Role  |
|-----------------|-------------|-------|
| admin@ppr.org   | Admin123!   | ADMIN |
| user@ppr.org    | User123!    | USER  |

## WebSocket Authentication

Connect with JWT token in handshake:

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:8000', {
  path: '/socket.io',
  auth: { token: accessToken },
});
```

### Rooms

- `user:{userId}` — user-specific events
- `role:{roleName}` — role-based broadcasts

### Events

| Event                  | Direction | Description              |
|------------------------|-----------|--------------------------|
| `notification:created` | Server → Client | New notification   |
| `entity:updated`       | Server → Client | Entity data changed |
| `user:status_changed`  | Server → Client | Online/offline status |

## API Response Format

**Success:**

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

**Error:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": []
}
```

## Project Structure

```
src/
├── common/          # Guards, filters, interceptors, decorators
├── config/          # Environment validation
├── modules/
│   ├── auth/        # Authentication
│   ├── users/       # User CRUD
│   ├── notifications/
│   ├── websocket/   # Socket.io gateway
│   └── health/
├── shared/
│   ├── prisma/
│   ├── redis/
│   └── queue/       # BullMQ (email example)
└── main.ts
```

## Scripts

| Command              | Description                |
|----------------------|----------------------------|
| `pnpm start:dev`     | Dev server with hot reload |
| `pnpm build`         | Production build           |
| `pnpm test`          | Unit tests                 |
| `pnpm test:e2e`      | E2E tests                  |
| `pnpm prisma:migrate`| Run migrations             |
| `pnpm prisma:seed`   | Seed database              |
| `pnpm prisma:studio` | Prisma Studio GUI          |

## Security

- Helmet middleware
- CORS restricted to frontend origin
- Rate limiting (Throttler)
- bcrypt password hashing (12 rounds)
- Refresh token rotation
- Input validation on all DTOs
