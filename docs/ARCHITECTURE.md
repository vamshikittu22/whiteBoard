# Collaborative Whiteboard Architecture (Phase 1 MVP)

## 1. High-Level Architecture (HLD)

The system follows a typical real-time Client-Server architecture.

*   **Client (SPA)**: React + Zustand. Handles local optimistic updates, rendering (Canvas/SVG), and captures user inputs. Sends `Ops` to server via WebSocket.
*   **API Gateway / Load Balancer**: Nginx (optional for MVP) -> Routes HTTP to API Server and WS to Realtime Server.
*   **API Server (Node/Express)**: Handles Auth, Board Management (CRUD), Organization logic.
*   **Realtime Server (Node/Socket.IO)**: 
    *   Maintains active room connections.
    *   Broadcasts Ops to peers.
    *   Persists Ops to Redis (Hot) and Postgres (Cold).
    *   Manages "Server Sequence" for eventual consistency.
*   **Database (PostgreSQL)**: Durable storage for Users, Orgs, Boards, Snapshots, and Op Logs.
*   **Cache (Redis)**: Pub/Sub channel for scaling WS nodes; Store for temporary presence data; Ephemeral Op buffer.

## 2. Repo Layout (Monorepo)

```
/
├── apps/
│   ├── web/ (Next.js/React App)
│   ├── api/ (Node/Express REST API)
│   └── realtime/ (Node/Socket.IO Service)
├── packages/
│   ├── db/ (Prisma Schema & Client)
│   ├── common/ (Shared Zod schemas, Types)
│   └── ui/ (Shared React components)
├── docker-compose.yml
└── package.json
```

## 3. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  orgId     String
  org       Organization @relation(fields: [orgId], references: [id])
  boards    BoardMember[]
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  users     User[]
  boards    Board[]
}

model Board {
  id        String   @id @default(uuid())
  title     String
  orgId     String
  org       Organization @relation(fields: [orgId], references: [id])
  ops       BoardOp[]
  snapshots BoardSnapshot[]
  members   BoardMember[]
  serverSeq Int      @default(0) // Monotonic counter
}

model BoardOp {
  id        String   @id @default(uuid()) // opId
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id])
  seq       Int      // Server assigned order
  type      String   // ADD, UPDATE, DELETE
  payload   Json     // The change data
  userId    String
  createdAt DateTime @default(now())
}

model BoardSnapshot {
  id        String   @id @default(uuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id])
  seq       Int      // Snapshot taken at this seq
  data      Json     // Full board state
  createdAt DateTime @default(now())
}
```

## 4. Realtime Protocol Spec

**Transport**: WebSocket (Socket.IO)

**Client -> Server Events**:
*   `join_board` { boardId, token }
*   `op` { opId, type, payload, tempSeq } -> Server validates, assigns `seq`, persists, broadcasts.
*   `cursor` { x, y } -> Throttled (e.g., 100ms), broadcast to room.

**Server -> Client Events**:
*   `init_state` { snapshot, ops_since_snapshot, current_seq }
*   `op` { seq, opId, type, payload, userId } -> Clients apply if `seq` = `local_seq` + 1.
*   `cursor` { userId, x, y }
*   `error` { code, message }

## 5. REST API Spec

*   `POST /auth/register`
*   `POST /auth/login`
*   `GET /orgs/:orgId/users`
*   `GET /boards` (List boards for user's org)
*   `POST /boards` (Create new board)
*   `GET /boards/:id` (Metadata)
*   `GET /boards/:id/export` (Download JSON)

## 6. UI Components
(Implemented in the codebase provided: `Toolbar`, `Whiteboard`, `PropertiesPanel`)

## 7. Implementation Plan

1.  **Setup**: Monorepo init, Docker Compose (pg, redis), Prisma init.
2.  **Auth Service**: JWT issuance, Login endpoint.
3.  **Realtime Service**: Socket.IO server, Room joining logic, Redis adapter.
4.  **Canvas Frontend**: React + SVG/Canvas, Tool logic, Zustand store.
5.  **Sync Logic**: Connect Frontend to Realtime Service. Implement "Server Authority" logic (apply remote ops).
6.  **Persistence**: Write `op` handler in backend to save to Postgres `BoardOp` table.
7.  **Snapshotting**: Background worker that compacts `BoardOp` rows into `BoardSnapshot` every 100 ops.
8.  **Polish**: Undo/Redo (local history stack), Cursors, Selection UI.
