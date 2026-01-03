import { BoardOp, User } from '../types';
import { useStore } from '../store';

// This acts as the Client-Side of the Realtime Protocol Spec
// Deliverable 4: Realtime Protocol Spec Implementation (Mock)

class MockSocketService {
  private connected = false;
  private interval: any;
  private userId: string | null = null;

  connect(boardId: string, user: User) {
    if (this.connected) return;
    this.connected = true;
    this.userId = user.id;

    console.log(`[Socket] Connected to board ${boardId} as ${user.name}`);
    
    // Auto-simulation removed per user request.
    // Realtime capabilities are now strictly opt-in or driven by actual events.
  }

  sendOp(op: BoardOp) {
    if (!this.connected) return;
    // In real app: socket.emit('op', op);
    console.log('[Socket] Outgoing OP:', op);
  }

  sendCursor(pos: { x: number; y: number }) {
    if (!this.connected) return;
    // In real app: socket.emit('cursor', pos);
    // console.log('[Socket] Outgoing Cursor:', pos);
  }

  disconnect() {
    this.connected = false;
    if (this.interval) clearInterval(this.interval);
  }
}

export const socketService = new MockSocketService();