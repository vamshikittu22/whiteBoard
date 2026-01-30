import { z } from 'zod';

// --- Primitives ---
export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

export const DimensionsSchema = z.object({
  width: z.number(),
  height: z.number(),
});
export type Dimensions = z.infer<typeof DimensionsSchema>;

export const RGBAColorSchema = z.string();

// --- Tools ---
export const ToolTypeSchema = z.enum(['select', 'hand', 'rect', 'ellipse', 'line', 'path', 'text', 'sticky', 'eraser', 'pen']);
export type ToolType = z.infer<typeof ToolTypeSchema>;

// --- Board Objects ---
export const BaseObjectSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  isLocked: z.boolean().default(false),
  opacity: z.number().min(0).max(1).default(1),
  // Styling
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeOpacity: z.number().min(0).max(1).optional(), // Added for Highlighter
});

export const RectObjectSchema = BaseObjectSchema.extend({
  type: z.literal('rect'),
  width: z.number(),
  height: z.number(),
  cornerRadius: z.number().optional(),
});

export const EllipseObjectSchema = BaseObjectSchema.extend({
  type: z.literal('ellipse'),
  radiusX: z.number(),
  radiusY: z.number(),
});

export const PathObjectSchema = BaseObjectSchema.extend({
  type: z.literal('path'),
  points: z.array(z.number()), // [x1, y1, x2, y2...] flattened for Konva
  tension: z.number().optional(),
});

export const TextObjectSchema = BaseObjectSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  width: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).default('left'),
});

export const StickyObjectSchema = BaseObjectSchema.extend({
  type: z.literal('sticky'),
  text: z.string(),
  width: z.number(),
  height: z.number(),
  color: z.enum(['yellow', 'blue', 'green', 'pink', 'orange']),
});

export const LineObjectSchema = BaseObjectSchema.extend({
  type: z.literal('line'),
  points: z.array(z.number()), // [x1, y1, x2, y2] for straight line
  arrowEnd: z.boolean().optional(),
});

// Union of all objects
export const CanvasItemSchema = z.discriminatedUnion('type', [
  RectObjectSchema,
  EllipseObjectSchema,
  PathObjectSchema,
  LineObjectSchema,
  TextObjectSchema,
  StickyObjectSchema,
]);

export type CanvasItem = z.infer<typeof CanvasItemSchema>;

// --- Operations (for Undo/Redo & Sync) ---
export type Op =
  | { type: 'create'; item: CanvasItem }
  | { type: 'update'; id: string; data: Partial<CanvasItem>; prev: Partial<CanvasItem> } // Prev required for undo
  | { type: 'delete'; id: string; item: CanvasItem } // Item required for undo
  | { type: 'clear' };

// --- Application State Interfaces ---
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface UserState {
  id: string;
  name: string;
  email?: string; // Added for compatibility with transport layer
  color: string;
  cursor: Point | null;
  lastActive: number;
}

export interface BoardMember {
  id: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'PENDING';
  userId: string;
  boardId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}