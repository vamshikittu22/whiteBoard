import { io, Socket } from 'socket.io-client';
import { TransportLayer, SyncMessage } from './types';

export class SocketIoTransport implements TransportLayer {
    private socket: Socket | null = null;
    private onMessageCallback: ((msg: SyncMessage) => void) | null = null;
    private accessToken: string | null = null;
    private clientId: string;

    constructor(accessToken: string, clientId: string) {
        this.accessToken = accessToken;
        this.clientId = clientId;
    }

    connect(boardId: string, onMessage: (msg: SyncMessage) => void) {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.onMessageCallback = onMessage;

        // Connect to Socket.IO server
        this.socket = io((import.meta as any).env.VITE_API_URL || 'http://localhost:4000', {
            auth: {
                token: this.accessToken,
                clientId: this.clientId
            }
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('[SocketIoTransport] Connected to server');

            // Join the board room
            this.socket!.emit('JOIN_BOARD', { boardId }, (response: any) => {
                if (response.error) {
                    console.error('[SocketIoTransport] JOIN_BOARD error:', response.error);
                    return;
                }

                console.log('[SocketIoTransport] Joined board:', boardId);
                console.log('[SocketIoTransport] Current seq:', response.lastSeq);

                if (this.onMessageCallback) {
                    // 1. Clear current state and apply snapshot if it exists
                    if (response.snapshot) {
                        this.onMessageCallback({
                            type: 'STATE_INIT',
                            items: response.snapshot.items,
                            itemOrder: response.snapshot.itemOrder,
                            boardId
                        } as any);
                    }

                    // 2. Play catch-up with missed operations
                    if (response.ops && response.ops.length > 0) {
                        console.log(`[SocketIoTransport] Applying ${response.ops.length} missed operations`);
                        for (const op of response.ops) {
                            this.onMessageCallback({
                                type: 'OP',
                                op: {
                                    type: op.opType,
                                    ...op.opData
                                },
                                boardId
                            });
                        }
                    }
                }
            });
        });

        // Listen for broadcasts from other users
        this.socket.on('OP_BROADCAST', (data: any) => {
            if (this.onMessageCallback) {
                this.onMessageCallback({
                    type: 'OP',
                    op: {
                        type: data.opType,
                        ...data.opData
                    },
                    boardId
                });
            }
        });

        this.socket.on('CURSOR_UPDATE', (data: any) => {
            if (this.onMessageCallback) {
                this.onMessageCallback({
                    type: 'CURSOR',
                    user: {
                        id: data.userId,
                        email: data.email,
                        name: data.email.split('@')[0],
                        color: '#3b82f6',
                        cursor: data.cursor,
                        lastActive: Date.now()
                    },
                    boardId
                });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('[SocketIoTransport] Disconnected from server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('[SocketIoTransport] Connection error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    send(msg: SyncMessage) {
        if (!this.socket || !this.socket.connected) {
            console.warn('[SocketIoTransport] Socket not connected, cannot send message');
            return;
        }

        if (msg.type === 'OP') {
            // Submit operation to server
            this.socket.emit('SUBMIT_OP', {
                boardId: msg.boardId,
                opId: `${this.clientId}_${Date.now()}_${Math.random()}`,
                opType: msg.op.type,
                opData: msg.op
            }, (response: any) => {
                if (response.error) {
                    console.error('[SocketIoTransport] SUBMIT_OP error:', response.error);
                } else {
                    // console.log('[SocketIoTransport] Op acknowledged, serverSeq:', response.serverSeq);
                    // logging less frequently or just errors is better for production
                }
            });
        } else if (msg.type === 'CURSOR') {
            // Send cursor position
            this.socket.emit('CURSOR', {
                boardId: msg.boardId,
                x: msg.user.cursor?.x || 0,
                y: msg.user.cursor?.y || 0
            });
        }
    }
}
