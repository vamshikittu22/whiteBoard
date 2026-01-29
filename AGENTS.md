# AGENTS.md - Development Guidelines for CollabCanvas

This document provides comprehensive guidelines for coding agents working on the CollabCanvas collaborative whiteboard application. Follow these conventions to maintain consistency across the codebase.

## Project Overview

CollabCanvas is a real-time collaborative whiteboard built with:
- **Frontend**: React 18 + TypeScript, Vite, TailwindCSS, Zustand, Konva, Socket.IO Client
- **Backend**: Node.js + TypeScript, Express, Socket.IO, Prisma, PostgreSQL
- **Architecture**: Real-time sync with operation-based CRDTs, JWT authentication, RBAC

## Quick Reference

### Most Common Commands
```bash
# Start development (frontend + backend)
npm run dev:all

# Run all tests
npm run test

# Type check both frontend and backend
npx tsc --noEmit && cd server && npx tsc --noEmit && cd ..

# Build for production
npm run build
```

## Build, Lint, and Test Commands

### Frontend Commands
```bash
# Development server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run all tests (Vitest)
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run a specific test file
npm run test -- store.test.ts

# Run tests with coverage
npm run test -- --coverage

# Type checking (frontend only)
npx tsc --noEmit
```

### Backend Commands
```bash
# Development server with hot reload (port 4000)
cd server && npm run dev

# Build TypeScript
cd server && npm run build

# Start production server
cd server && npm run start

# Database operations
cd server && npm run db:push      # Push schema changes
cd server && npm run db:migrate   # Run migrations
cd server && npm run db:studio    # Open Prisma Studio

# Type checking (backend only)
cd server && npx tsc --noEmit
```

### Combined Development
```bash
# Run both frontend and backend concurrently
npm run dev:all
```

## Environment Setup

### Required Environment Variables

#### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:4000
VITE_USE_SOCKETIO=true

# Optional: Gemini AI API (if used)
VITE_GEMINI_API_KEY=your_key_here
```

#### Backend (server/.env)
```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/collabcanvas?schema=public"

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET="your_secure_random_string_here"
JWT_REFRESH_SECRET="your_secure_random_string_here"

# Optional: Port override
PORT=4000
```

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module System**: ESNext with bundler resolution
- **JSX**: React JSX transform
- **Path Aliases**: `@/` maps to `./src/` (frontend), relative imports in backend
- **Strict Mode**: Enabled with isolated modules and force module detection

### Import Organization
Group imports in this order with blank lines between groups:
1. React imports
2. Third-party library imports (alphabetical)
3. Local imports (relative paths)

```typescript
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import { nanoid } from 'nanoid';

import { useStore } from './store';
import { UserState } from './types';
```

### Naming Conventions

#### Variables and Functions
- Use `camelCase` for variables, functions, and object properties
- Boolean variables should be prefixed with `is`, `has`, `can`, etc.
```typescript
const isDragging: boolean;
const hasPermission: boolean;
const selectedIds: string[];
```

#### Components and Types
- Use `PascalCase` for React components, interfaces, and type definitions
- Type names should be descriptive and end with the data structure type when appropriate
```typescript
interface UserState { ... }
type ToolType = 'select' | 'hand' | 'rect';
const CanvasItemSchema = z.object({ ... });
```

#### Files and Directories
- Use `PascalCase` for component files: `KonvaBoard.tsx`, `Toolbar.tsx`
- Use `camelCase` for utility files: `store.ts`, `utils.ts`, `api.ts`
- Use `kebab-case` for directories: `components/`, `transport/`, `middleware/`

### Code Structure Patterns

#### React Components
- Use functional components with hooks
- Prefer early returns for conditional rendering
- Use descriptive component names
- Extract complex logic into custom hooks
- Use `useCallback` for event handlers passed to child components

```typescript
export default function App() {
    const { view, currentUser } = useStore();

    // Early return for conditional rendering
    if (view === 'login') return <Login />;
    if (view === 'dashboard') return <Dashboard />;

    return (
        <div className="app-container">
            {/* Component JSX */}
        </div>
    );
}
```

#### State Management (Zustand)
- Define comprehensive interfaces for state shape
- Group related state properties logically
- Use descriptive action names
- Separate concerns: navigation, board state, collaboration, etc.

```typescript
interface AppState {
    // Navigation
    view: 'login' | 'dashboard' | 'board';
    currentUser: UserState | null;

    // Board State
    items: Record<string, CanvasItem>;
    viewport: Viewport;

    // Actions
    login: (email: string, name?: string) => Promise<void>;
    setViewport: (v: Viewport) => void;
}
```

#### API Routes (Backend)
- Use async/await for all database operations
- Implement proper error handling with try/catch
- Return appropriate HTTP status codes
- Log errors with context prefixes: `[Auth]`, `[Socket]`, etc.

```typescript
router.post('/register', async (req, res) => {
    try {
        const { email, name, password } = req.body;

        // Business logic here

        res.json({ user, accessToken, refreshToken });
    } catch (error) {
        console.error('[Auth] Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

### Type Safety

#### Zod Schemas
- Define schemas for all data structures
- Use discriminated unions for polymorphic types
- Validate data at API boundaries
- Export both schema and inferred type

```typescript
export const CanvasItemSchema = z.discriminatedUnion('type', [
    RectObjectSchema,
    EllipseObjectSchema,
    PathObjectSchema,
// ...
]);

export type CanvasItem = z.infer<typeof CanvasItemSchema>;
```

#### Interface Definitions
- Use interfaces for object shapes
- Prefer interfaces over type aliases for object types
- Include optional properties with `?`
- Use union types for constrained values

```typescript
interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

interface UserState {
    id: string;
    name: string;
    email?: string;
    color: string;
    cursor: Point | null;
    lastActive: number;
}
```

### Error Handling

#### Frontend
- Use try/catch for async operations
- Display user-friendly error messages
- Log errors for debugging
- Handle loading states appropriately

```typescript
const login = async (email: string, password: string) => {
    try {
        setLoading(true);
        const data = await api.post('/api/auth/login', { email, password });
        // Success handling
    } catch (error) {
        console.error('Login failed:', error);
        setError('Invalid email or password');
    } finally {
        setLoading(false);
    }
};
```

#### Backend
- Wrap route handlers in try/catch
- Return structured error responses
- Log errors with context
- Use appropriate HTTP status codes

### Testing

#### Test Structure (Vitest)
- Use Vitest for testing framework
- Group tests with `describe` blocks
- Use descriptive test names
- Mock external dependencies with `vi.fn()`

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Store Core Logic', () => {
    it('should apply create operation correctly', () => {
        // Test implementation
    });
});
```

#### Test File Organization
- Place tests in `__tests__/` directory
- Name test files with `.test.ts` suffix
- Mirror source file structure

### Styling (TailwindCSS)

#### Class Organization
- Use semantic class names
- Group related classes logically
- Use responsive prefixes consistently
- Leverage Tailwind's utility classes

```typescript
<div className="flex items-center justify-between px-6 py-4 bg-white border border-slate-200 rounded-lg shadow-sm">
```

#### Component Styling
- Prefer utility classes over custom CSS
- Use consistent spacing scale
- Maintain design system colors and spacing

### Security Best Practices

#### Authentication
- Validate JWT tokens on protected routes
- Use secure password hashing (bcrypt)
- Implement proper token expiration
- Never log sensitive information

#### Input Validation
- Validate all user inputs with Zod schemas
- Sanitize data before database operations
- Use parameterized queries (Prisma handles this)

#### CORS and Headers
- Configure CORS properly for cross-origin requests
- Set appropriate security headers
- Validate request origins

### Database Operations

#### Prisma Usage
- Use Prisma Client for all database operations
- Select only needed fields for performance
- Handle connection errors gracefully
- Use transactions for multi-step operations

```typescript
const user = await prisma.user.create({
    data: { email, name, password: hashedPassword },
    select: { id: true, email: true, name: true, createdAt: true }
});
```

### Real-time Communication

#### Socket.IO Events
- Use descriptive event names
- Handle connection/disconnection gracefully
- Implement proper error handling for socket events
- Validate message payloads

#### Operation-based Sync
- Use operations (ops) for state changes
- Implement undo/redo with inverse operations
- Ensure operations are idempotent
- Handle concurrent modifications

### Performance Considerations

#### React Optimization
- Use React.memo for expensive components
- Implement proper dependency arrays in useEffect
- Avoid unnecessary re-renders
- Use virtualization for large lists
- Use useCallback for event handlers

#### Bundle Optimization
- Lazy load route components
- Optimize imports and tree shaking
- Minimize bundle size
- Use code splitting appropriately

### File Organization

#### Frontend Structure
```
src/
├── components/          # React components
│   ├── Canvas/         # Canvas-related components
│   └── ui/             # Reusable UI components
├── lib/                # Utility libraries
├── transport/          # Real-time sync layer
├── store.ts           # Global state management
├── types.ts           # TypeScript definitions
├── utils.ts           # Helper functions
└── __tests__/         # Test files
```

#### Backend Structure
```
server/src/
├── routes/            # API route handlers
├── middleware/        # Express middleware
├── socket/            # Socket.IO handlers
├── utils/             # Helper functions
└── index.ts          # Server entry point
```

### Git Workflow

#### Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- Start with action verb (Add, Fix, Update, Remove, Refactor)
- Keep first line under 50 characters
- Add detailed description for complex changes

#### Branch Naming
- Use feature branches: `feature/user-authentication`
- Use bugfix branches: `fix/canvas-rendering-issue`
- Use descriptive names with hyphens

### Development Environment

#### Environment Variables
- Use `.env.example` files for required variables
- Never commit actual `.env` files
- Document all required environment variables
- Use descriptive variable names

#### Development Setup
- Use the provided npm scripts for consistent development
- Ensure PostgreSQL is running for backend development
- Use the combined `dev:all` command for full-stack development

### Code Review Checklist

- [ ] TypeScript types are correct and complete
- [ ] Error handling is implemented
- [ ] Tests are written and passing
- [ ] Code follows established patterns
- [ ] Security best practices are followed
- [ ] Performance considerations are addressed
- [ ] Documentation is updated if needed

### Common Patterns to Follow

1. **Early Returns**: Use early returns for conditional logic
2. **Destructuring**: Prefer destructuring for props and state
3. **Optional Chaining**: Use `?.` for safe property access
4. **Nullish Coalescing**: Use `??` for default values
5. **Template Literals**: Use backticks for string interpolation
6. **Arrow Functions**: Prefer arrow functions for callbacks
7. **Async/Await**: Use async/await over Promises for readability

### Tools and Dependencies

#### Essential Tools
- **TypeScript**: For type safety
- **Vitest**: For testing
- **Prisma**: For database operations
- **TailwindCSS**: For styling
- **Zod**: For runtime type validation

#### Development Dependencies
- **Vite**: Fast build tool and dev server
- **tsx**: TypeScript execution for development
- **Concurrently**: Run multiple commands simultaneously
- **Autoprefixer/PostCSS**: CSS processing

This document should be updated as the codebase evolves and new patterns emerge. Always refer to existing code for examples of proper implementation.