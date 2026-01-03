import { Op, UserState } from './types';

export type SyncMessage = 
  | { type: 'OP'; op: Op; boardId: string }
  | { type: 'CURSOR'; user: UserState; boardId: string };

export interface TransportLayer {
  connect: (boardId: string, onMessage: (msg: SyncMessage) => void) => void;
  disconnect: () => void;
  send: (msg: SyncMessage) => void;
}

export class BroadcastTransport implements TransportLayer {
  private channel: BroadcastChannel | null = null;
  private onMessageCallback: ((msg: SyncMessage) => void) | null = null;

  connect(boardId: string, onMessage: (msg: SyncMessage) => void) {
    if (this.channel) {
      this.channel.close();
    }
    
    this.onMessageCallback = onMessage;
    this.channel = new BroadcastChannel(`collab-canvas-${boardId}`);
    
    this.channel.onmessage = (event) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(event.data as SyncMessage);
      }
    };
    
    console.log(`[Transport] Connected to board: ${boardId}`);
  }

  disconnect() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  send(msg: SyncMessage) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }
}
