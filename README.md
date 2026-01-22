# CollabCanvas - Real-time Collaborative Whiteboard

A production-ready collaborative whiteboard application with real-time synchronization, built with React, Socket.io, and PostgreSQL.

## Features

- **Real-time Collaboration**: Multiple users can edit the same board simultaneously
- **Monotonic Synchronization**: Server-side ordering ensures consistency
- **RBAC**: Owner, Editor, and Viewer roles for granular permissions
- **JWT Authentication**: Secure access with token rotation
- **Idempotent Operations**: Duplicate operations are automatically handled
- **Full Drawing Tools**: Pen, shapes, sticky notes, text, and more

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Zustand (state management)
- Konva (canvas rendering)
- Socket.IO Client (real-time)

### Backend
- Node.js + TypeScript
- Express (REST API)
- Socket.IO (WebSocket server)
- Prisma (ORM)
- PostgreSQL (database)
- JWT (authentication)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup Instructions

### 1. Clone & Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb collabcanvas
```

Configure environment variables:

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/collabcanvas?schema=public"
JWT_ACCESS_SECRET="YOUR_SECURE_RANDOM_STRING_HERE"
JWT_REFRESH_SECRET="YOUR_SECURE_RANDOM_STRING_HERE"
```

Run migrations:

```bash
cd server
npm run db:push
cd ..
```

### 3. Run the Application

Start both frontend and backend:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1 - Frontend (Port 3000)
npm run dev

# Terminal 2 - Backend (Port 4000)
npm run dev:server
```

## API Verification

### Health Check

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{"status":"ok","timestamp":1234567890}
```

### Register User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": "..."
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Create Board

```bash
curl -X POST http://localhost:4000/api/boards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My First Board"
  }'
```

### Socket.IO Connection

The frontend will automatically connect to the Socket.IO server when:
1. User is authenticated
2. User opens a board
3. `VITE_USE_SOCKETIO=true` is set (optional, defaults to BroadcastChannel)

## Transport Modes

The application supports two transport modes:

### 1. BroadcastChannel (Default)
- Local-only synchronization
- No backend required
- Perfect for local development and prototyping
- Data persisted in localStorage

### 2. Socket.IO (Production)
- Server-backed real-time sync
- Cross-device collaboration
- Persistent data in PostgreSQL
- Role-based access control

To enable Socket.IO mode, set in your `.env`:
```env
VITE_USE_SOCKETIO=true
VITE_API_URL=http://localhost:4000
```

## Project Structure

```
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── transport/          # Sync layer (Broadcast & Socket.IO)
│   ├── store.ts            # Zustand state management
│   ├── types.ts            # TypeScript types
│   └── index.tsx           # Entry point
├── server/                 # Backend source
│   ├── prisma/             # Database schema
│   ├── src/
│   │   ├── routes/         # REST API routes
│   │   ├── socket/         # Socket.IO handlers
│   │   ├── middleware/     # Auth middleware
│   │   └── utils/          # Helpers
│   └── package.json
└── package.json            # Root package config
```

## Development Commands

```bash
# Frontend only
npm run dev

# Backend only
npm run dev:server

# Both concurrently
npm run dev:all

# Run tests
npm run test

# Build for production
npm run build
```

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running:
```bash
psql -U postgres -l
```

Test the connection string:
```bash
psql "postgresql://USER:PASSWORD@localhost:5432/collabcanvas"
```

### Port Conflicts

If ports 3000 or 4000 are in use, modify:
- Frontend: `vite.config.ts` → `server.port`
- Backend: `server/.env` → `PORT=YOUR_PORT`

### Missing Dependencies

```bash
# Clean install
rm -rf node_modules server/node_modules package-lock.json server/package-lock.json
npm install
cd server && npm install
```

## License

MIT
