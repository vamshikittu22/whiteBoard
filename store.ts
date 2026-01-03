import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { CanvasItem, ToolType, Viewport, UserState, Op } from './types';
import { BroadcastTransport, TransportLayer } from './transport';

const transport: TransportLayer = new BroadcastTransport();

// --- Constants ---
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

interface BoardMetadata {
  id: string;
  name: string;
  updatedAt: number;
}

interface AppState {
  // Navigation
  view: 'login' | 'dashboard' | 'board';
  currentUser: UserState | null;
  currentBoardId: string | null;
  boards: BoardMetadata[];
  
  // Board State
  items: Record<string, CanvasItem>;
  itemOrder: string[];
  viewport: Viewport;
  
  // Collaboration
  peers: Record<string, UserState>;
  
  // History
  past: Op[];
  future: Op[];

  // Tools & UI
  activeTool: ToolType;
  selectedIds: string[];
  isDragging: boolean;
  defaultStyle: { stroke: string; fill: string; strokeWidth: number; strokeOpacity: number };
  
  // Actions
  login: (name: string) => void;
  createBoard: (name: string) => void;
  openBoard: (id: string) => void;
  deleteBoard: (id: string) => void;
  exitBoard: () => void;
  
  setViewport: (v: Viewport) => void;
  setTool: (tool: ToolType) => void;
  selectObject: (id: string | null, multi?: boolean) => void;
  
  // Styling
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeOpacity: (opacity: number) => void;
  setBrushPreset: (type: 'pencil' | 'marker' | 'highlighter') => void;

  // Op Actions (Undo/Redo aware)
  dispatch: (op: Op, broadcast?: boolean) => void;
  undo: () => void;
  redo: () => void;
  
  // Presence
  updateCursor: (pos: {x: number, y: number} | null) => void;
}

export const useStore = create<AppState>((set, get) => {
  // --- Load Initial State ---
  const savedUser = localStorage.getItem('cc_user');
  const savedBoards = JSON.parse(localStorage.getItem('cc_boards') || '[]');
  
  const initialUser = savedUser ? JSON.parse(savedUser) : null;

  // --- Transport Listener ---
  const handleMessage = (msg: any) => {
    const state = get();
    
    if (msg.type === 'OP') {
      applyOpToState(set, msg.op);
    } 
    else if (msg.type === 'CURSOR') {
       set(s => ({
         peers: { ...s.peers, [msg.user.id]: msg.user }
       }));
    }
  };

  return {
    view: initialUser ? 'dashboard' : 'login',
    currentUser: initialUser,
    currentBoardId: null,
    boards: savedBoards,
    
    items: {},
    itemOrder: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    peers: {},
    past: [],
    future: [],
    
    activeTool: 'select',
    selectedIds: [],
    isDragging: false,
    defaultStyle: { stroke: '#000000', fill: 'transparent', strokeWidth: 4, strokeOpacity: 1 }, 

    // --- Navigation Actions ---
    login: (name) => {
      const user: UserState = {
        id: nanoid(),
        name,
        color: getRandomColor(),
        cursor: null,
        lastActive: Date.now()
      };
      localStorage.setItem('cc_user', JSON.stringify(user));
      set({ currentUser: user, view: 'dashboard' });
    },

    createBoard: (name) => {
      const newBoard: BoardMetadata = { id: nanoid(), name, updatedAt: Date.now() };
      const boards = [newBoard, ...get().boards];
      localStorage.setItem('cc_boards', JSON.stringify(boards));
      set({ boards });
    },

    openBoard: (id) => {
      const savedContent = localStorage.getItem(`cc_board_${id}`);
      let content = { items: {}, itemOrder: [] };
      if (savedContent) content = JSON.parse(savedContent);

      transport.connect(id, handleMessage);
      
      set({ 
        view: 'board', 
        currentBoardId: id,
        items: content.items,
        itemOrder: content.itemOrder,
        past: [],
        future: [],
        peers: {}
      });
    },

    deleteBoard: (id) => {
       const boards = get().boards.filter(b => b.id !== id);
       localStorage.setItem('cc_boards', JSON.stringify(boards));
       set({ boards });
    },

    exitBoard: () => {
      transport.disconnect();
      set({ view: 'dashboard', currentBoardId: null });
    },

    // --- Editor Actions ---
    setViewport: (v) => set({ viewport: v }),
    setTool: (t) => set({ activeTool: t, selectedIds: [] }),
    selectObject: (id, multi = false) => set((state) => {
      if (!id) return { selectedIds: [] };
      if (multi) {
        return { 
          selectedIds: state.selectedIds.includes(id) 
            ? state.selectedIds.filter(i => i !== id)
            : [...state.selectedIds, id] 
        };
      }
      return { selectedIds: [id] };
    }),

    setStrokeColor: (color) => set(state => ({
      defaultStyle: { ...state.defaultStyle, stroke: color },
      items: updateSelectedItems(state, { stroke: color })
    })),

    setStrokeWidth: (width) => set(state => ({
      defaultStyle: { ...state.defaultStyle, strokeWidth: width },
      items: updateSelectedItems(state, { strokeWidth: width })
    })),

    setStrokeOpacity: (opacity) => set(state => ({
      defaultStyle: { ...state.defaultStyle, strokeOpacity: opacity },
      items: updateSelectedItems(state, { strokeOpacity: opacity })
    })),

    setBrushPreset: (type) => set(state => {
      let style = { ...state.defaultStyle };
      switch (type) {
        case 'pencil':
          style = { ...style, strokeWidth: 2, strokeOpacity: 1 };
          break;
        case 'marker':
          style = { ...style, strokeWidth: 5, strokeOpacity: 1 };
          break;
        case 'highlighter':
          style = { ...style, strokeWidth: 20, strokeOpacity: 0.4, stroke: '#f59e0b' }; // Default yellow
          break;
      }
      return { defaultStyle: style };
    }),

    // --- Core Logic ---
    dispatch: (op, broadcast = true) => {
      const state = get();
      
      applyOpToState(set, op);
      
      set(s => ({
        past: [...s.past, op],
        future: [] 
      }));

      if (broadcast && state.currentBoardId) {
        saveBoardState(state.currentBoardId, get().items, get().itemOrder);
        transport.send({ 
          type: 'OP', 
          op, 
          boardId: state.currentBoardId 
        });
      }
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;

      const op = state.past[state.past.length - 1];
      const inverseOp = getInverseOp(op);
      
      applyOpToState(set, inverseOp);

      set(s => ({
        past: s.past.slice(0, -1),
        future: [op, ...s.future]
      }));
      
      if (state.currentBoardId) {
        transport.send({ 
           type: 'OP', 
           op: inverseOp, 
           boardId: state.currentBoardId 
        });
        saveBoardState(state.currentBoardId, get().items, get().itemOrder);
      }
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;

      const op = state.future[0];
      
      applyOpToState(set, op);

      set(s => ({
        future: s.future.slice(1),
        past: [...s.past, op]
      }));

      if (state.currentBoardId) {
        transport.send({ 
           type: 'OP', 
           op: op, 
           boardId: state.currentBoardId 
        });
        saveBoardState(state.currentBoardId, get().items, get().itemOrder);
      }
    },

    updateCursor: (point) => {
      const state = get();
      if (!state.currentUser || !state.currentBoardId) return;
      transport.send({
        type: 'CURSOR',
        boardId: state.currentBoardId,
        user: { ...state.currentUser, cursor: point, lastActive: Date.now() }
      });
    }
  };
});

// --- Helper Functions ---

function updateSelectedItems(state: AppState, patch: Partial<CanvasItem>) {
  if (state.selectedIds.length === 0) return state.items;
  const newItems = { ...state.items };
  for (const id of state.selectedIds) {
    if (newItems[id]) {
      newItems[id] = { ...newItems[id], ...patch } as any;
    }
  }
  return newItems;
}

function applyOpToState(set: any, op: Op) {
  set((state: AppState) => {
    switch (op.type) {
      case 'create':
        return {
          items: { ...state.items, [op.item.id]: op.item },
          itemOrder: [...state.itemOrder, op.item.id]
        };
      case 'update':
        if (!state.items[op.id]) return state;
        return {
          items: {
            ...state.items,
            [op.id]: { ...state.items[op.id], ...op.data }
          }
        };
      case 'delete':
        const newItems = { ...state.items };
        delete newItems[op.id];
        return {
          items: newItems,
          itemOrder: state.itemOrder.filter(id => id !== op.id),
          selectedIds: state.selectedIds.filter(id => id !== op.id)
        };
      default:
        return state;
    }
  });
}

function getInverseOp(op: Op): Op {
  switch (op.type) {
    case 'create':
      return { type: 'delete', id: op.item.id, item: op.item };
    case 'delete':
      return { type: 'create', item: op.item };
    case 'update':
      return { type: 'update', id: op.id, data: op.prev, prev: op.data };
  }
}

function saveBoardState(boardId: string, items: any, itemOrder: any) {
  localStorage.setItem(`cc_board_${boardId}`, JSON.stringify({ items, itemOrder }));
}