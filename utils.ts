import { Point, Viewport, BoardObject } from './types';

// Coordinate Transforms
export const screenToWorld = (screen: Point, viewport: Viewport): Point => {
  return {
    x: (screen.x - viewport.x) / viewport.zoom,
    y: (screen.y - viewport.y) / viewport.zoom
  };
};

export const worldToScreen = (world: Point, viewport: Viewport): Point => {
  return {
    x: world.x * viewport.zoom + viewport.x,
    y: world.y * viewport.zoom + viewport.y
  };
};

// Hit Testing
export const isPointInRect = (point: Point, rect: { x: number; y: number; width: number; height: number }) => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// SVG Path Helpers
export const pointsToPath = (points: Point[]) => {
  if (points.length === 0) return '';
  const start = points[0];
  let d = `M ${start.x} ${start.y}`;
  // Simple line smoothing could be added here (Catmull-Rom or Quadratic Bezier)
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
};

// Phase 2: Connector Logic
// Returns the center point of an object for simple anchoring
export const getObjectCenter = (obj: BoardObject): Point => {
  if (obj.type === 'path') {
    return obj.points[0] || { x: 0, y: 0 };
  }
  return {
    x: obj.x + (obj.width || 0) / 2,
    y: obj.y + (obj.height || 0) / 2
  };
};
