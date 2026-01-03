# Phase 2: Productivity & Scale Implementation Plan

## 1. Data Model Changes (Prisma & Types)
*   **New Object Types**: `image`, `connector`.
*   **Image**: Stores `src` (S3 URL), `mimeType`.
*   **Connector**: Stores `startId`, `endId` (UUIDs of connected shapes) OR `startPoint`, `endPoint` (if unconnected).
*   **Search**: Enable GIN indexes on `BoardOp.payload` (Postgres) for JSONB search.

## 2. Component Updates
*   **Whiteboard.tsx**: 
    *   Add Drag & Drop handlers for images.
    *   Implement "Spatial Grid" filtering for rendering (Performance).
*   **Renderer.tsx**: Support `<image>` and `<line>` (connector) SVG elements.
*   **Toolbar.tsx**: Add tools for Connectors and Images.
*   **HistoryPanel.tsx**: New UI for Time Travel (slider) and Search.

## 3. Logic & Algorithms
*   **Connectors**: When a shape moves, find all connectors referencing its ID and update their visual coordinates dynamically.
*   **Spatial Indexing**: Divide canvas into 1000x1000 grids. Only render objects within viewport grids.
*   **Async Export**: (Simulated) Store triggers a "job", UI shows "Processing...", resolves after 2s.

## 4. Testing & Quality
*   **E2E**: Add Playwright setup.
*   **Observability**: Add request IDs to API calls (mocked in `socket.ts`).

## 5. Backend Schema (Reference for Implementation)

```prisma
// Add GIN index for search
model BoardOp {
  // ... existing fields
  @@index([payload(ops: JsonbOps)], type: Gin)
}
```
