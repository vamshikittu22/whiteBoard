import { Op, UserState } from '../types';

export type SyncMessage =
    | { type: 'OP'; op: Op; boardId: string }
    | { type: 'CURSOR'; user: UserState; boardId: string };

export interface TransportLayer {
    connect: (boardId: string, onMessage: (msg: SyncMessage) => void) => void;
    disconnect: () => void;
    send: (msg: SyncMessage) => void;
}
