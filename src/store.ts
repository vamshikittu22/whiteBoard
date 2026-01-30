import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { CanvasItem, ToolType, Viewport, UserState, Op, BoardMember } from './types';
import { createTransport, TransportLayer } from './transport';
import { storage } from './persistence';
import { api } from './lib/api';

const CLIENT_ID = nanoid();
let transport: TransportLayer | null = null;

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
  accessToken: string | null;
  currentBoardId: string | null;
  currentUserRole: 'OWNER' | 'EDITOR' | 'VIEWER' | 'PENDING' | null;
  boards: BoardMetadata[];
  boardMembers: BoardMember[];

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
  exportTrigger: number;

  // Actions
  login: (email: string, name?: string, password?: string, isRegister?: boolean) => Promise<void>;
  loadBoards: () => Promise<void>;
  createBoard: (name: string) => Promise<void>;
  openBoard: (id: string) => void;
  openBoardFromUrl: (id: string) => Promise<void>;
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
  triggerExport: () => void;

  // Presence
  updateCursor: (pos: { x: number, y: number } | null) => void;

  // Member Management (Owner only)
  loadBoardMembers: (boardId: string) => Promise<void>;
  updateMemberRole: (boardId: string, userId: string, role: string) => Promise<void>;
  approveMember: (boardId: string, userId: string, role?: string) => Promise<void>;
  removeMember: (boardId: string, userId: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => {
  // --- Load Initial State ---
  let initialUser = null;
  let savedToken = null;

  try {
    const savedUserStr = storage.getItem('cc_user');
    savedToken = storage.getItem('cc_token');
    initialUser = savedUserStr ? JSON.parse(savedUserStr) : null;
  } catch (e) {
    console.error('[Store] Failed to parse saved user:', e);
    storage.removeItem('cc_user');
    storage.removeItem('cc_token');
  }

  if (savedToken) {
    api.setToken(savedToken);
    // Explicitly load boards if token exists
    setTimeout(() => {
      useStore.getState().loadBoards();
    }, 0);
  }

  // --- Parse URL for Board ID ---
  let urlBoardId: string | null = null;
  if (typeof window !== 'undefined') {
    const pathMatch = window.location.pathname.match(/^\/board\/([^\/]+)$/);
    if (pathMatch) {
      urlBoardId = pathMatch[1];
      console.log('[Store] Found board ID in URL:', urlBoardId);
    }
  }

  // --- API Event Listeners ---
  if (typeof window !== 'undefined') {
    window.addEventListener('api-unauthorized', () => {
      console.warn('[Store] Unauthorized access, logging out...');
      storage.removeItem('cc_user');
      storage.removeItem('cc_token');
      api.setToken(null);
      set({
        currentUser: null,
        accessToken: null,
        view: 'login',
        currentBoardId: null,
        items: {},
        itemOrder: []
      });
    });
  }

  // --- Transport Listener ---
  const handleMessage = (msg: any) => {
    if (msg.type === 'OP') {
      applyOpToState(set, msg.op);
    }
    else if (msg.type === 'STATE_INIT') {
      set({
        items: msg.items,
        itemOrder: msg.itemOrder,
        past: [],
        future: []
      });
    }
    else if (msg.type === 'CURSOR') {
      set(s => ({
        peers: { ...s.peers, [msg.user.id]: msg.user }
      }));
    }
  };

  // Determine initial view based on URL and auth state
  const getInitialView = () => {
    if (urlBoardId && initialUser) {
      // Has board ID in URL and is authenticated - will auto-open board
      return 'board';
    }
    if (urlBoardId && !initialUser) {
      // Has board ID but not authenticated - show login first
      return 'login';
    }
    return initialUser ? 'dashboard' : 'login';
  };

  // Auto-open board from URL after store initialization if authenticated
  if (urlBoardId && initialUser) {
    setTimeout(() => {
      console.log('[Store] Auto-opening board from URL:', urlBoardId);
      useStore.getState().openBoardFromUrl(urlBoardId);
    }, 100);
  }

  return {
    view: getInitialView(),
    currentUser: initialUser,
    accessToken: savedToken,
    currentBoardId: urlBoardId && initialUser ? urlBoardId : null,
    currentUserRole: null,
    boards: [],
    boardMembers: [],

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
    exportTrigger: 0,

    // --- Navigation Actions ---
    login: async (emailOrName, name, password, isRegister = false) => {
      try {
        let endpoint, payload;

        // Check if it's a guest login (called as login(name))
        const isGuest = !password && !isRegister && emailOrName && !name;

        if (isGuest) {
          endpoint = '/api/auth/guest';
          payload = { name: emailOrName };
        } else {
          endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
          payload = { email: emailOrName, name, password };
        }

        const data = await api.post(endpoint, payload);

        const user = {
          ...data.user,
          color: getRandomColor(),
          cursor: null,
          lastActive: Date.now()
        };

        storage.setItem('cc_user', JSON.stringify(user));
        storage.setItem('cc_token', data.accessToken);
        api.setToken(data.accessToken);

        // Check if there's a pending board ID from URL (user opened shared board while logged out)
        const pendingBoardId = sessionStorage.getItem('pendingBoardId');
        if (pendingBoardId) {
          sessionStorage.removeItem('pendingBoardId');
          console.log('[Store] Opening pending board after login:', pendingBoardId);
          set({ currentUser: user, accessToken: data.accessToken });
          get().loadBoards();
          // Open the board after a short delay to ensure boards are loaded
          setTimeout(() => {
            get().openBoardFromUrl(pendingBoardId);
          }, 100);
        } else {
          set({ currentUser: user, accessToken: data.accessToken, view: 'dashboard' });
          get().loadBoards();
        }
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },

    loadBoards: async () => {
      try {
        const boards = await api.get('/api/boards');
        set({ boards });
      } catch (error) {
        console.error('Failed to load boards:', error);
      }
    },

    createBoard: async (name) => {
      try {
        const newBoard = await api.post('/api/boards', { name });
        set(s => ({ boards: [newBoard, ...s.boards] }));
      } catch (error) {
        console.error('Failed to create board:', error);
      }
    },

    openBoard: async (id) => {
      const state = get();
      if (!state.accessToken) return;

      transport = createTransport('socketio', state.accessToken, CLIENT_ID);
      transport.connect(id, handleMessage);

      // Update URL to reflect the board being opened
      if (typeof window !== 'undefined') {
        window.history.pushState({ boardId: id }, '', `/board/${id}`);
      }

      set({
        view: 'board',
        currentBoardId: id,
        items: {}, // Will be populated by transport
        itemOrder: [], // Will be populated by transport
        past: [],
        future: [],
        peers: {}
      });

      // Fetch board details to get user's role
      try {
        const board = await api.get(`/api/boards/${id}`);
        if (board && board.userRole) {
          set({ currentUserRole: board.userRole as any });
          // If user is owner, load all members
          if (board.userRole === 'OWNER') {
            get().loadBoardMembers(id);
          }
        }
      } catch (error) {
        console.error('[Store] Failed to fetch board details:', error);
      }
    },

    openBoardFromUrl: async (id) => {
      const state = get();
      if (!state.accessToken) {
        // Store the board ID to open after login
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingBoardId', id);
        }
        return;
      }

      transport = createTransport('socketio', state.accessToken, CLIENT_ID);
      transport.connect(id, handleMessage);

      set({
        view: 'board',
        currentBoardId: id,
        items: {},
        itemOrder: [],
        past: [],
        future: [],
        peers: {}
      });

      // Fetch board details to get user's role
      try {
        const board = await api.get(`/api/boards/${id}`);
        if (board && board.userRole) {
          set({ currentUserRole: board.userRole as any });
          // If user is owner, load all members
          if (board.userRole === 'OWNER') {
            get().loadBoardMembers(id);
          }
        }
      } catch (error) {
        console.error('[Store] Failed to fetch board details:', error);
      }
    },

    deleteBoard: async (id) => {
      try {
        await api.delete(`/api/boards/${id}`);
        set(s => ({ boards: s.boards.filter(b => b.id !== id) }));
      } catch (error) {
        console.error('Failed to delete board:', error);
      }
    },

    exitBoard: () => {
      if (transport) {
        transport.disconnect();
        transport = null;
      }
      // Clear the board URL when exiting
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/');
      }
      set({ 
        view: 'dashboard', 
        currentBoardId: null,
        currentUserRole: null,
        boardMembers: []
      });
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

      if (broadcast && state.currentBoardId && transport) {
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

      if (state.currentBoardId && transport) {
        transport.send({
          type: 'OP',
          op: inverseOp,
          boardId: state.currentBoardId
        });
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

      if (state.currentBoardId && transport) {
        transport.send({
          type: 'OP',
          op: op,
          boardId: state.currentBoardId
        });
      }
    },

    updateCursor: (point) => {
      const state = get();
      if (!state.currentUser || !state.currentBoardId || !transport) return;
      transport.send({
        type: 'CURSOR',
        boardId: state.currentBoardId,
        user: { ...state.currentUser, cursor: point, lastActive: Date.now() }
      });
    },

    triggerExport: () => set(s => ({ exportTrigger: s.exportTrigger + 1 })),

    // --- Member Management Actions ---
    loadBoardMembers: async (boardId) => {
      try {
        const members = await api.get(`/api/boards/${boardId}/members`);
        set({ boardMembers: members });
      } catch (error) {
        console.error('Failed to load board members:', error);
      }
    },

    updateMemberRole: async (boardId, userId, role) => {
      try {
        await api.patch(`/api/boards/${boardId}/members/${userId}`, { role });
        // Refresh members list
        get().loadBoardMembers(boardId);
      } catch (error) {
        console.error('Failed to update member role:', error);
        throw error;
      }
    },

    approveMember: async (boardId, userId, role = 'VIEWER') => {
      try {
        await api.post(`/api/boards/${boardId}/approve/${userId}`, { role });
        // Refresh members list
        get().loadBoardMembers(boardId);
      } catch (error) {
        console.error('Failed to approve member:', error);
        throw error;
      }
    },

    removeMember: async (boardId, userId) => {
      try {
        await api.delete(`/api/boards/${boardId}/members/${userId}`);
        // Refresh members list
        get().loadBoardMembers(boardId);
      } catch (error) {
        console.error('Failed to remove member:', error);
        throw error;
      }
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

export function applyOpToState(set: any, op: Op) {
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
      case 'clear':
        return {
          items: {},
          itemOrder: [],
          selectedIds: [],
          past: [],
          future: []
        };
      default:
        return state;
    }
  });
}

export function getInverseOp(op: Op): Op {
  switch (op.type) {
    case 'create':
      return { type: 'delete', id: op.item.id, item: op.item };
    case 'delete':
      return { type: 'create', item: op.item };
    case 'update':
      return { type: 'update', id: op.id, data: op.prev, prev: op.data };
    case 'clear':
      return { type: 'clear' };
    default:
      throw new Error('Unknown op type');
  }
}