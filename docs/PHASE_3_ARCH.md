# Phase 3: Enterprise & Offline Architecture

## 1. Architecture Updates

### New Services
*   **Audit Service**: Decoupled service (or async worker) that ingests sensitive events (Auth, Permission Changes, Data Access) and writes to an immutable append-only table.
*   **Webhook Dispatcher**: A reliable queuing system (BullMQ + Redis) to process event subscriptions. Handles exponential backoff and Dead Letter Queues (DLQ).
*   **Sync Engine (Dual Mode)**:
    *   **Mode A (Default)**: Server Authoritative (Socket.IO). Good for strict validation.
    *   **Mode B (Offline/CRDT)**: Yjs via `y-websocket`. Best for spotty connections. 
    *   *Migration*: Data is stored as Snapshots (JSON). CRDT binary updates are merged into snapshots periodically.

## 2. Security & RBAC Model
*   **Organization-Level Roles**: `ADMIN` (Manage users, billing), `MEMBER` (Create boards), `GUEST` (View only).
*   **Board-Level Roles**: `OWNER`, `EDITOR`, `VIEWER`.
*   **Object-Level Locking**: `lockedBy` field on objects. Only the locker or Board Owner can unlock/edit.

## 3. Database Schema (Prisma)

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  orgId     String
  actorId   String   // User who performed action
  action    String   // e.g. "BOARD_EXPORT", "MEMBER_REMOVE"
  resource  String   // e.g. "board:123"
  metadata  Json?
  ipAddress String?
  createdAt DateTime @default(now())
}

model WebhookEndpoint {
  id        String   @id @default(uuid())
  orgId     String
  url       String
  secret    String   // HMAC signing secret
  events    String[] // ["board.updated", "member.joined"]
  active    Boolean  @default(true)
}

model WebhookDelivery {
  id          String   @id @default(uuid())
  endpointId  String
  eventId     String
  statusCode  Int
  duration    Int
  createdAt   DateTime @default(now())
}
```

## 4. Webhook Design
*   **Payload**: Standard CloudEvents format.
*   **Security**: `X-Hub-Signature-256` header containing HMAC-SHA256(payload, secret).
*   **Retry Policy**: Immediate, 5s, 1m, 10m, 1h.

## 5. Offline/CRDT Strategy (Yjs)
*   **Data Structure**: Map<ID, Y.Map> mirroring `BoardObject`.
*   **Conflict Resolution**: Last-Write-Wins (LWW) for simple properties; Yjs internal logic for text/arrays.
*   **Implementation**: Feature flag `useCRDT`. If true, client initializes `Y.Doc`, connects `WebrtcProvider` or `WebsocketProvider`.
