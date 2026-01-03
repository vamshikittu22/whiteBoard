import { create } from 'zustand';
import { BoardObject, BoardOp, ToolType, User, Viewport, UserRole, Point, AuditLogEntry, WebhookConfig } from './types';
import { nanoid } from 'nanoid';
import { socketService } from './services/socket';

interface AppState {
  // User/Auth
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  
  // Board State
  boardId: string | null;
  objects: Record<string, BoardObject>; // Normalized state
  objectOrder: string[]; // Z-index handling
  
  // UI State
  viewport: Viewport;
  activeTool: ToolType;
  selectedIds: string[];
  isSpacePressed: boolean;
  
  // Tool Properties
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  
  // Realtime
  peers: User[];
  
  // Phase 2: History & Export
  isExporting: boolean;

  // Phase 3: Enterprise & Offline
  isAdminOpen: boolean;
  isShareOpen: boolean; // New state for Share Modal
  isMenuOpen: boolean;  // New state for Main Menu
  auditLogs: AuditLogEntry[];
  webhooks: WebhookConfig[];
  offlineMode: boolean; // Simulates disconnected/offline state
  
  // Actions
  initBoard: (id: string) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setTool: (tool: ToolType) => void;
  selectObjects: (ids: string[], append?: boolean) => void;
  updateObject: (id: string, updates: Partial<BoardObject>) => void;
  createObject: (obj: BoardObject) => void;
  deleteObjects: (ids: string[]) => void;
  triggerExport: () => Promise<void>;
  
  // Phase 3 Actions
  toggleAdmin: () => void;
  setShareOpen: (open: boolean) => void; // New action
  setMenuOpen: (open: boolean) => void;   // New action
  addWebhook: (url: string) => void;
  toggleLock: (id: string) => void;
  setOfflineMode: (offline: boolean) => void;
  
  // Interaction Handlers
  onPointerMove: (pt: Point) => void;
  
  // Socket Integration
  applyRemoteOp: (op: BoardOp) => void;
  updatePeer: (user: User) => void;
  removePeer: (userId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  boardId: null,
  objects: {},
  objectOrder: [],
  
  viewport: { x: 0, y: 0, zoom: 1 },
  activeTool: ToolType.SELECT,
  selectedIds: [],
  isSpacePressed: false,
  
  strokeColor: '#000000',
  strokeWidth: 2,
  fillColor: 'transparent',
  
  peers: [],
  isExporting: false,

  isAdminOpen: false,
  isShareOpen: false,
  isMenuOpen: false,
  auditLogs: [
    { id: '1', action: 'LOGIN', actor: 'Alice', resource: 'System', timestamp: new Date(Date.now() - 100000).toISOString() },
    { id: '2', action: 'BOARD_CREATE', actor: 'Alice', resource: 'Board Q3', timestamp: new Date(Date.now() - 90000).toISOString() },
  ],
  webhooks: [],
  offlineMode: false,
  
  initBoard: (id) => {
    set({ boardId: id });
    // Connect to socket
    socketService.connect(id, get().currentUser!);
  },
  
  setViewport: (vp) => set(state => ({ viewport: { ...state.viewport, ...vp } })),
  
  setTool: (tool) => set({ activeTool: tool, selectedIds: [] }),
  
  selectObjects: (ids, append = false) => set(state => ({
    selectedIds: append ? [...state.selectedIds, ...ids] : ids
  })),
  
  createObject: (obj) => {
    const { currentUser, boardId } = get();
    // Optimistic update
    set(state => ({
      objects: { ...state.objects, [obj.id]: obj },
      objectOrder: [...state.objectOrder, obj.id]
    }));
    
    // Broadcast
    if (currentUser && boardId && !get().offlineMode) {
      const op: BoardOp = {
        opId: nanoid(),
        userId: currentUser.id,
        type: 'ADD',
        objectIds: [obj.id],
        payload: obj
      };
      socketService.sendOp(op);
    }
    
    // Audit
    if (currentUser) {
      get().auditLogs.push({
         id: nanoid(),
         action: 'OBJECT_CREATE',
         actor: currentUser.name,
         resource: obj.type,
         timestamp: new Date().toISOString()
      });
    }
  },
  
  updateObject: (id, updates) => {
    const { currentUser, boardId, objects } = get();
    
    // Phase 3: Lock Check
    const obj = objects[id];
    if (obj?.locked && obj.lockedBy !== currentUser?.id && !currentUser?.isAdmin) {
      // Prevent edit if locked by someone else
      return; 
    }

    set(state => ({
      objects: {
        ...state.objects,
        [id]: { ...state.objects[id], ...updates } as BoardObject
      }
    }));
    
    // Broadcast (debouncing would happen in a real app)
    if (currentUser && boardId && !get().offlineMode) {
       const op: BoardOp = {
        opId: nanoid(),
        userId: currentUser.id,
        type: 'UPDATE',
        objectIds: [id],
        payload: updates
      };
      socketService.sendOp(op);
    }
  },
  
  deleteObjects: (ids) => {
    const { currentUser, boardId, objects } = get();
    
    // Phase 3: Filter out locked objects
    const idsToDelete = ids.filter(id => {
       const obj = objects[id];
       if (obj?.locked && obj.lockedBy !== currentUser?.id && !currentUser?.isAdmin) return false;
       return true;
    });

    if (idsToDelete.length === 0) return;

    set(state => {
      const newObjects = { ...state.objects };
      idsToDelete.forEach(id => delete newObjects[id]);
      return {
        objects: newObjects,
        objectOrder: state.objectOrder.filter(oid => !idsToDelete.includes(oid)),
        selectedIds: []
      };
    });
    
     if (currentUser && boardId && !get().offlineMode) {
       const op: BoardOp = {
        opId: nanoid(),
        userId: currentUser.id,
        type: 'DELETE',
        objectIds: idsToDelete
      };
      socketService.sendOp(op);
    }
  },
  
  // Phase 2: Async Export Simulation
  triggerExport: async () => {
    set({ isExporting: true });
    // Simulate Bull Queue delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    set({ isExporting: false });
    
    // Audit
    set(state => ({
      auditLogs: [{
        id: nanoid(), 
        action: 'BOARD_EXPORT', 
        actor: state.currentUser?.name || 'Unknown', 
        resource: 'Board.png', 
        timestamp: new Date().toISOString() 
      }, ...state.auditLogs]
    }));
    
    alert("Export Job Complete! (Simulated download)");
  },
  
  // Phase 3 Actions
  toggleAdmin: () => set(state => ({ isAdminOpen: !state.isAdminOpen })),
  
  setShareOpen: (open) => set({ isShareOpen: open }),
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  
  addWebhook: (url) => set(state => ({
    webhooks: [...state.webhooks, { id: nanoid(), url, active: true, events: ['board.updated'] }]
  })),

  toggleLock: (id) => {
    const { currentUser, objects } = get();
    const obj = objects[id];
    if (!obj || !currentUser) return;
    
    // Only owner or admin can unlock
    if (obj.locked && obj.lockedBy !== currentUser.id && !currentUser.isAdmin) {
      alert("You cannot unlock an object locked by someone else.");
      return;
    }

    const updates = { 
      locked: !obj.locked, 
      lockedBy: !obj.locked ? currentUser.id : undefined 
    };
    get().updateObject(id, updates);
  },
  
  setOfflineMode: (offline) => {
    set({ offlineMode: offline });
    if (offline) {
       socketService.disconnect();
    } else {
       // In a real app, we would perform sync/merge here (CRDT sync)
       const { boardId, currentUser } = get();
       if (boardId && currentUser) socketService.connect(boardId, currentUser);
    }
  },

  onPointerMove: (pt) => {
    const { currentUser } = get();
    if (currentUser && !get().offlineMode) {
      socketService.sendCursor({ ...pt });
    }
  },
  
  applyRemoteOp: (op) => {
    set(state => {
      // In a real CRDT or server-authoritative model, we'd check sequence numbers here.
      // For MVP, simplistic application.
      if (op.type === 'ADD' && op.payload) {
        const obj = op.payload as BoardObject;
        return {
          objects: { ...state.objects, [obj.id]: obj },
          objectOrder: [...state.objectOrder, obj.id]
        };
      }
      if (op.type === 'UPDATE' && op.payload) {
        const newObjects = { ...state.objects };
        op.objectIds.forEach(id => {
          if (newObjects[id]) {
            newObjects[id] = { ...newObjects[id], ...op.payload } as BoardObject;
          }
        });
        return { objects: newObjects };
      }
      if (op.type === 'DELETE') {
         const newObjects = { ...state.objects };
         op.objectIds.forEach(id => delete newObjects[id]);
         return {
            objects: newObjects,
            objectOrder: state.objectOrder.filter(oid => !op.objectIds.includes(oid))
         };
      }
      return state;
    });
  },
  
  updatePeer: (peer) => {
    set(state => {
      const index = state.peers.findIndex(p => p.id === peer.id);
      if (index === -1) return { peers: [...state.peers, peer] };
      const newPeers = [...state.peers];
      newPeers[index] = peer;
      return { peers: newPeers };
    });
  },
  
  removePeer: (userId) => {
    set(state => ({ peers: state.peers.filter(p => p.id !== userId) }));
  }
}));