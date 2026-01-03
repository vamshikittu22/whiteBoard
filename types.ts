// Domain Models

export enum UserRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  name: string;
  color: string; // Cursor color
  cursor?: { x: number; y: number };
  isAdmin?: boolean; // Enterprise feature
}

export enum ToolType {
  SELECT = 'SELECT',
  HAND = 'HAND',
  PEN = 'PEN',
  RECTANGLE = 'RECTANGLE',
  ELLIPSE = 'ELLIPSE',
  TEXT = 'TEXT',
  STICKY = 'STICKY',
  CONNECTOR = 'CONNECTOR',
  ERASER = 'ERASER'
}

export interface Point {
  x: number;
  y: number;
}

export type BoardObjectType = 'path' | 'rect' | 'ellipse' | 'text' | 'sticky' | 'image' | 'connector';

export interface BaseObject {
  id: string;
  type: BoardObjectType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  zIndex: number;
  isDeleted?: boolean;
  // Phase 3: Object Locking
  locked?: boolean;
  lockedBy?: string; // userId
}

export interface PathObject extends BaseObject {
  type: 'path';
  points: Point[];
}

export interface ShapeObject extends BaseObject {
  type: 'rect' | 'ellipse';
}

export interface TextObject extends BaseObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface StickyObject extends BaseObject {
  type: 'sticky';
  text: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
}

export interface ImageObject extends BaseObject {
  type: 'image';
  src: string; // URL
  mimeType: string;
}

export interface ConnectorObject extends BaseObject {
  type: 'connector';
  startId?: string; // ID of object attached to start
  endId?: string;   // ID of object attached to end
  start?: Point;    // Fallback if no ID
  end?: Point;      // Fallback if no ID
}

export type BoardObject = PathObject | ShapeObject | TextObject | StickyObject | ImageObject | ConnectorObject;

export interface BoardState {
  id: string;
  title: string;
  objects: Map<string, BoardObject>; // Using Map for O(1) access
  version: number; // Server sequence number
}

// Architecture Types (Mocking Backend Protocol)

export type OpType = 'ADD' | 'UPDATE' | 'DELETE';

export interface BoardOp {
  opId: string; // Idempotency key
  seq?: number; // Server assigned sequence
  userId: string;
  type: OpType;
  objectIds: string[];
  payload?: Partial<BoardObject>; // For Update/Add
  timestamp?: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Phase 3: Enterprise Types

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  resource: string;
  timestamp: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  active: boolean;
  events: string[];
}

export const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', 
  '#d946ef', '#f43f5e', '#000000', '#64748b'
];

export const STICKY_COLORS = {
  yellow: '#fef3c7',
  blue: '#dbeafe',
  green: '#dcfce7',
  pink: '#fce7f3'
};
