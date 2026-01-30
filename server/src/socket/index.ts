import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/auth.js';
import { prisma } from '../utils/db.js';

interface SocketData {
    userId: string;
    email: string;
    clientId: string;
    userName?: string;
}

interface AuthenticatedSocket extends Socket {
    data: SocketData;
}

// Store io instance for broadcasting outside of handlers
let ioInstance: SocketIOServer;

export function initializeSocketServer(httpServer: HttpServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true
        }
    });

    ioInstance = io;

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
                clientId: socket.handshake.auth.clientId || socket.id,
                userName: user.name
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

                // First check if board exists
                const board = await prisma.board.findUnique({ where: { id: boardId } });
                if (!board) {
                    return callback({ error: 'Board not found' });
                }

                // Check membership
                let membership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    },
                    include: { user: { select: { id: true, name: true, email: true } } }
                });

                // Auto-add user if not a member (enables sharing via URL)
                if (!membership) {
                    const defaultRole = board.requireApproval ? 'PENDING' : 'VIEWER';
                    console.log(`[Socket] Auto-adding user ${socket.data.email} as ${defaultRole} to board ${boardId}`);
                    membership = await prisma.boardMember.create({
                        data: {
                            userId: socket.data.userId,
                            boardId: boardId,
                            role: defaultRole
                        },
                        include: { user: { select: { id: true, name: true, email: true } } }
                    });

                    // Notify owner if approval is required
                    if (board.requireApproval) {
                        socket.to(`board:${boardId}`).emit('APPROVAL_REQUESTED', {
                            userId: socket.data.userId,
                            email: socket.data.email,
                            name: membership.user.name
                        });
                    }

                    // Broadcast that a new member joined with their role
                    io.to(`board:${boardId}`).emit('MEMBER_JOINED', {
                        userId: socket.data.userId,
                        email: socket.data.email,
                        name: membership.user.name,
                        role: membership.role
                    });
                } else {
                    // User is already a member, broadcast their join with role
                    io.to(`board:${boardId}`).emit('MEMBER_JOINED', {
                        userId: socket.data.userId,
                        email: socket.data.email,
                        name: socket.data.userName,
                        role: membership.role
                    });
                }

                // Join room (even for pending users, so they can receive approval notifications)
                await socket.join(`board:${boardId}`);

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
                        opData,
                        userId: socket.data.userId,
                        userName: socket.data.userName,
                        userEmail: socket.data.email
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
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                    userEmail: socket.data.email
                });

                // Also broadcast activity event
                io.to(`board:${boardId}`).emit('ACTIVITY_UPDATE', {
                    type: 'op',
                    opType,
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                    userEmail: socket.data.email,
                    timestamp: Date.now()
                });

            } catch (error) {
                console.error('[Socket] SUBMIT_OP error:', error);
                callback({ error: 'Failed to process operation' });
            }
        });

        // UPDATE_BOARD_SETTINGS
        socket.on('UPDATE_BOARD_SETTINGS', async (data: {
            boardId: string;
            requireApproval?: boolean;
            name?: string;
        }, callback) => {
            try {
                const { boardId, requireApproval, name } = data;

                // Check if user is OWNER
                const membership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    }
                });

                if (!membership || membership.role !== 'OWNER') {
                    return callback({ error: 'Only board owners can update settings' });
                }

                const updateData: any = {};
                if (typeof requireApproval === 'boolean') {
                    updateData.requireApproval = requireApproval;
                }
                if (name) {
                    updateData.name = name;
                }

                const updatedBoard = await prisma.board.update({
                    where: { id: boardId },
                    data: updateData
                });

                // Broadcast settings change to all members
                io.to(`board:${boardId}`).emit('BOARD_SETTINGS_UPDATED', {
                    boardId,
                    settings: updateData,
                    updatedBy: {
                        userId: socket.data.userId,
                        email: socket.data.email,
                        name: socket.data.userName
                    }
                });

                callback({ success: true, board: updatedBoard });
            } catch (error) {
                console.error('[Socket] UPDATE_BOARD_SETTINGS error:', error);
                callback({ error: 'Failed to update board settings' });
            }
        });

        // REQUEST_EDIT_ACCESS
        socket.on('REQUEST_EDIT_ACCESS', async (data: {
            boardId: string;
        }, callback) => {
            try {
                const { boardId } = data;

                // Check if user is a member
                const membership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    }
                });

                if (!membership) {
                    return callback({ error: 'You are not a member of this board' });
                }

                if (membership.role !== 'VIEWER') {
                    return callback({ error: 'Only viewers can request edit access' });
                }

                // Find the owner
                const owner = await prisma.boardMember.findFirst({
                    where: { boardId, role: 'OWNER' },
                    include: { user: { select: { id: true, name: true, email: true } } }
                });

                if (!owner) {
                    return callback({ error: 'No owner found for this board' });
                }

                // Broadcast request to all members (so owner can see it)
                io.to(`board:${boardId}`).emit('EDIT_ACCESS_REQUESTED', {
                    boardId,
                    userId: socket.data.userId,
                    email: socket.data.email,
                    name: socket.data.userName,
                    requestedAt: Date.now()
                });

                callback({ success: true, message: 'Request sent to board owner' });
            } catch (error) {
                console.error('[Socket] REQUEST_EDIT_ACCESS error:', error);
                callback({ error: 'Failed to request edit access' });
            }
        });

        // UPDATE_MEMBER_ROLE (for owners to update roles via socket)
        socket.on('UPDATE_MEMBER_ROLE', async (data: {
            boardId: string;
            targetUserId: string;
            role: 'OWNER' | 'EDITOR' | 'VIEWER';
        }, callback) => {
            try {
                const { boardId, targetUserId, role } = data;

                // Check if requester is OWNER
                const requesterMembership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    }
                });

                if (!requesterMembership || requesterMembership.role !== 'OWNER') {
                    return callback({ error: 'Only board owners can change roles' });
                }

                // Prevent removing the last owner
                if (role !== 'OWNER') {
                    const ownerCount = await prisma.boardMember.count({
                        where: { boardId, role: 'OWNER' }
                    });
                    const targetMember = await prisma.boardMember.findUnique({
                        where: { userId_boardId: { userId: targetUserId, boardId } }
                    });
                    if (ownerCount <= 1 && targetMember?.role === 'OWNER') {
                        return callback({ error: 'Cannot remove the last owner' });
                    }
                }

                const updatedMember = await prisma.boardMember.update({
                    where: { userId_boardId: { userId: targetUserId, boardId } },
                    data: { role },
                    include: { user: { select: { id: true, name: true, email: true } } }
                });

                // Broadcast role update to all members
                io.to(`board:${boardId}`).emit('MEMBER_ROLE_UPDATED', {
                    boardId,
                    userId: targetUserId,
                    role,
                    updatedBy: {
                        userId: socket.data.userId,
                        email: socket.data.email,
                        name: socket.data.userName
                    },
                    user: updatedMember.user
                });

                callback({ success: true, member: updatedMember });
            } catch (error) {
                console.error('[Socket] UPDATE_MEMBER_ROLE error:', error);
                callback({ error: 'Failed to update member role' });
            }
        });

        // REMOVE_MEMBER (for owners to remove members via socket)
        socket.on('REMOVE_MEMBER', async (data: {
            boardId: string;
            targetUserId: string;
        }, callback) => {
            try {
                const { boardId, targetUserId } = data;

                // Check if requester is OWNER or removing themselves
                const requesterMembership = await prisma.boardMember.findUnique({
                    where: {
                        userId_boardId: { userId: socket.data.userId, boardId }
                    }
                });

                const isOwner = requesterMembership?.role === 'OWNER';
                const isSelfRemoval = socket.data.userId === targetUserId;

                if (!isOwner && !isSelfRemoval) {
                    return callback({ error: 'Only board owners can remove members' });
                }

                // Prevent owners from removing themselves if they're the last owner
                if (isSelfRemoval && requesterMembership?.role === 'OWNER') {
                    const ownerCount = await prisma.boardMember.count({
                        where: { boardId, role: 'OWNER' }
                    });
                    if (ownerCount <= 1) {
                        return callback({ error: 'Cannot remove yourself as the last owner' });
                    }
                }

                // Get member info before deletion for the notification
                const targetMember = await prisma.boardMember.findUnique({
                    where: { userId_boardId: { userId: targetUserId, boardId } },
                    include: { user: { select: { id: true, name: true, email: true } } }
                });

                await prisma.boardMember.delete({
                    where: { userId_boardId: { userId: targetUserId, boardId } }
                });

                // Broadcast member removal to all members
                io.to(`board:${boardId}`).emit('MEMBER_REMOVED', {
                    boardId,
                    userId: targetUserId,
                    removedBy: isSelfRemoval ? null : {
                        userId: socket.data.userId,
                        email: socket.data.email,
                        name: socket.data.userName
                    },
                    isSelfRemoval,
                    user: targetMember?.user
                });

                // If not self-removal, also kick the user from the room
                if (!isSelfRemoval) {
                    // Find all sockets of the removed user and make them leave the room
                    const targetSockets = await io.in(`board:${boardId}`).fetchSockets();
                    for (const s of targetSockets) {
                        const authSocket = s as any;
                        if (authSocket.data?.userId === targetUserId) {
                            s.leave(`board:${boardId}`);
                            s.emit('REMOVED_FROM_BOARD', {
                                boardId,
                                reason: 'removed_by_owner',
                                removedBy: {
                                    userId: socket.data.userId,
                                    email: socket.data.email,
                                    name: socket.data.userName
                                }
                            });
                        }
                    }
                }

                callback({ success: true });
            } catch (error) {
                console.error('[Socket] REMOVE_MEMBER error:', error);
                callback({ error: 'Failed to remove member' });
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
            socket.to(`data.boardId}`).emit('USER_ACTIVE', {
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

// Export a function to get the io instance for use in routes
export function getIO(): SocketIOServer {
    if (!ioInstance) {
        throw new Error('Socket.IO not initialized yet');
    }
    return ioInstance;
}
