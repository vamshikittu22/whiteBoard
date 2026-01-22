import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/auth.js';
import { prisma } from '../utils/db.js';

interface SocketData {
    userId: string;
    email: string;
    clientId: string;
}

interface AuthenticatedSocket extends Socket {
    data: SocketData;
}

export function initializeSocketServer(httpServer: HttpServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true
        }
    });

    // Auth middleware for Socket.IO
    io.use(async (socket: Socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const payload = verifyAccessToken(token);
            const user = await prisma.user.findUnique({ where: { id: payload.userId } });

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.data = {
                userId: user.id,
                email: user.email,
                clientId: socket.handshake.auth.clientId || socket.id
            };

            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket: AuthenticatedSocket) => {
        console.log(`[Socket] User ${socket.data.email} connected (${socket.id})`);

        // JOIN_BOARD
        socket.on('JOIN_BOARD', async (data: { boardId: string }, callback) => {
            try {
                const { boardId } = data;

                // Check membership
                const membership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    }
                });

                if (!membership) {
                    return callback({ error: 'Board not found or access denied' });
                }

                // Join room
                await socket.join(`board:${boardId}`);

                // Get latest snapshot or reconstruct from ops
                const board = await prisma.board.findUnique({ where: { id: boardId } });
                if (!board) {
                    return callback({ error: 'Board not found' });
                }

                const latestSnapshot = await prisma.boardSnapshot.findFirst({
                    where: { boardId },
                    orderBy: { seq: 'desc' }
                });

                const opsAfterSnapshot = await prisma.boardOp.findMany({
                    where: {
                        boardId,
                        serverSeq: { gt: latestSnapshot?.seq || 0 }
                    },
                    orderBy: { serverSeq: 'asc' }
                });

                callback({
                    snapshot: latestSnapshot ? {
                        items: latestSnapshot.items,
                        itemOrder: latestSnapshot.itemOrder,
                        seq: String(latestSnapshot.seq)
                    } : { items: {}, itemOrder: [], seq: '0' },
                    ops: opsAfterSnapshot.map(op => ({
                        serverSeq: String(op.serverSeq),
                        opType: op.opType,
                        opData: op.opData
                    })),
                    lastSeq: String(board.lastSeq),
                    role: membership.role
                });

                // Broadcast presence
                socket.to(`board:${boardId}`).emit('USER_JOINED', {
                    userId: socket.data.userId,
                    email: socket.data.email
                });
            } catch (error) {
                console.error('[Socket] JOIN_BOARD error:', error);
                callback({ error: 'Failed to join board' });
            }
        });

        // SUBMIT_OP
        socket.on('SUBMIT_OP', async (data: {
            boardId: string;
            opId: string;
            opType: string;
            opData: any;
        }, callback) => {
            try {
                const { boardId, opId, opType, opData } = data;

                // Check membership and permissions
                const membership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    }
                });

                if (!membership) {
                    return callback({ error: 'Access denied' });
                }

                if (membership.role === 'VIEWER') {
                    return callback({ error: 'Viewers cannot edit boards' });
                }

                // Idempotency check
                const existing = await prisma.boardOp.findUnique({
                    where: {
                        boardId_opId_clientId: {
                            boardId,
                            opId,
                            clientId: socket.data.clientId
                        }
                    }
                });

                if (existing) {
                    // Already processed, send ACK with existing serverSeq
                    return callback({
                        serverSeq: existing.serverSeq.toString(),
                        acknowledged: true
                    });
                }

                // Increment lastSeq and create op
                const board = await prisma.board.update({
                    where: { id: boardId },
                    data: { lastSeq: { increment: 1 } }
                });

                const serverSeq = board.lastSeq;

                await prisma.boardOp.create({
                    data: {
                        boardId,
                        serverSeq,
                        opId,
                        clientId: socket.data.clientId,
                        opType,
                        opData
                    }
                });

                // Send ACK to sender
                callback({
                    serverSeq: String(serverSeq),
                    acknowledged: true
                });

                // Broadcast to others in the room
                socket.to(`board:${boardId}`).emit('OP_BROADCAST', {
                    serverSeq: String(serverSeq),
                    opType,
                    opData,
                    userId: socket.data.userId
                });

            } catch (error) {
                console.error('[Socket] SUBMIT_OP error:', error);
                callback({ error: 'Failed to process operation' });
            }
        });

        // CURSOR
        socket.on('CURSOR', (data: { boardId: string; x: number; y: number }) => {
            const { boardId, x, y } = data;
            socket.to(`board:${boardId}`).emit('CURSOR_UPDATE', {
                userId: socket.data.userId,
                email: socket.data.email,
                cursor: { x, y }
            });
        });

        // Presence heartbeat
        socket.on('PRESENCE', (data: { boardId: string }) => {
            socket.to(`board:${data.boardId}`).emit('USER_ACTIVE', {
                userId: socket.data.userId,
                email: socket.data.email,
                timestamp: Date.now()
            });
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] User ${socket.data.email} disconnected (${socket.id})`);
        });
    });

    console.log('[Socket.IO] Server initialized');
    return io;
}
