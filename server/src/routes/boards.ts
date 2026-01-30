import express from 'express';
import { prisma } from '../utils/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { getIO } from '../socket/index.js';

const router = express.Router();

// Create Board
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { name, orgId } = req.body;

        const board = await prisma.board.create({
            data: {
                name,
                orgId: orgId || null,
                members: {
                    create: {
                        userId: req.userId!,
                        role: 'OWNER'
                    }
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } }
                }
            }
        });

        res.json(board);
    } catch (error) {
        console.error('[Boards] Create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User's Boards
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const memberships = await prisma.boardMember.findMany({
            where: { userId: req.userId },
            include: {
                board: {
                    include: {
                        members: {
                            include: { user: { select: { id: true, name: true, email: true } } }
                        }
                    }
                }
            }
        });

        const boards = memberships.map(m => ({ ...m.board, userRole: m.role }));
        res.json(boards);
    } catch (error) {
        console.error('[Boards] List error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Board by ID (with auto-add for shared board access)
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        // Check if board exists first
        const board = await prisma.board.findUnique({ where: { id } });
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        let membership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } },
            include: {
                board: {
                    include: {
                        members: {
                            include: { user: { select: { id: true, name: true, email: true } } }
                        }
                    }
                }
            }
        });

        // Auto-add user with appropriate role based on board settings
        if (!membership) {
            const defaultRole = board.requireApproval ? 'PENDING' : 'VIEWER';
            console.log(`[Boards] Auto-adding user ${req.userId} as ${defaultRole} to board ${id}`);
            membership = await prisma.boardMember.create({
                data: {
                    userId: req.userId!,
                    boardId: id,
                    role: defaultRole
                },
                include: {
                    board: {
                        include: {
                            members: {
                                include: { user: { select: { id: true, name: true, email: true } } }
                            }
                        }
                    }
                }
            });
        }

        res.json({ ...membership.board, userRole: membership.role });
    } catch (error) {
        console.error('[Boards] Get error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Board Members (OWNER only)
router.get('/:id/members', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        // Check if requester is OWNER
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!requesterMembership || requesterMembership.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only board owners can view members' });
        }

        const members = await prisma.boardMember.findMany({
            where: { boardId: id },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { role: 'asc' }
        });

        res.json(members);
    } catch (error) {
        console.error('[Boards] List members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Member Role (OWNER only)
router.patch('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id, userId } = req.params;
        const { role } = req.body;

        if (!role || !['OWNER', 'EDITOR', 'VIEWER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be OWNER, EDITOR, or VIEWER' });
        }

        // Check if requester is OWNER
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!requesterMembership || requesterMembership.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only board owners can change roles' });
        }

        // Prevent removing the last owner
        if (role !== 'OWNER') {
            const ownerCount = await prisma.boardMember.count({
                where: { boardId: id, role: 'OWNER' }
            });
            const targetMember = await prisma.boardMember.findUnique({
                where: { userId_boardId: { userId, boardId: id } }
            });
            if (ownerCount <= 1 && targetMember?.role === 'OWNER') {
                return res.status(400).json({ error: 'Cannot remove the last owner' });
            }
        }

        const updatedMember = await prisma.boardMember.update({
            where: { userId_boardId: { userId, boardId: id } },
            data: { role },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        // Broadcast role update via Socket.IO
        try {
            const io = getIO();
            io.to(`board:${id}`).emit('MEMBER_ROLE_UPDATED', {
                boardId: id,
                userId,
                role,
                updatedBy: {
                    userId: req.userId,
                    email: req.userEmail
                },
                user: updatedMember.user
            });
        } catch (socketError) {
            console.error('[Boards] Failed to broadcast role update:', socketError);
        }

        res.json(updatedMember);
    } catch (error) {
        console.error('[Boards] Update member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove Member (OWNER only, or self-removal)
router.delete('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id, userId } = req.params;

        // Check if requester is OWNER or removing themselves
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        const isOwner = requesterMembership?.role === 'OWNER';
        const isSelfRemoval = req.userId === userId;

        if (!isOwner && !isSelfRemoval) {
            return res.status(403).json({ error: 'Only board owners can remove members' });
        }

        // Prevent owners from removing themselves if they're the last owner
        if (isSelfRemoval && requesterMembership?.role === 'OWNER') {
            const ownerCount = await prisma.boardMember.count({
                where: { boardId: id, role: 'OWNER' }
            });
            if (ownerCount <= 1) {
                return res.status(400).json({ error: 'Cannot remove yourself as the last owner. Transfer ownership first.' });
            }
        }

        // Get member info before deletion for the notification
        const targetMember = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId, boardId: id } },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        await prisma.boardMember.delete({
            where: { userId_boardId: { userId, boardId: id } }
        });

        // Broadcast member removal via Socket.IO
        try {
            const io = getIO();
            io.to(`board:${id}`).emit('MEMBER_REMOVED', {
                boardId: id,
                userId,
                removedBy: isSelfRemoval ? null : {
                    userId: req.userId,
                    email: req.userEmail
                },
                isSelfRemoval,
                user: targetMember?.user
            });

            // If not self-removal, kick the user from the room
            if (!isSelfRemoval) {
                const targetSockets = await io.in(`board:${id}`).fetchSockets();
                for (const socket of targetSockets) {
                    const authSocket = socket as any;
                    if (authSocket.data?.userId === userId) {
                        socket.leave(`board:${id}`);
                        socket.emit('REMOVED_FROM_BOARD', {
                            boardId: id,
                            reason: 'removed_by_owner',
                            removedBy: {
                                userId: req.userId,
                                email: req.userEmail
                            }
                        });
                    }
                }
            }
        } catch (socketError) {
            console.error('[Boards] Failed to broadcast member removal:', socketError);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Boards] Remove member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Approve Pending Member (OWNER only)
router.post('/:id/approve/:userId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id, userId } = req.params;
        const { role } = req.body;

        // Check if requester is OWNER
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!requesterMembership || requesterMembership.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only board owners can approve members' });
        }

        const approvedRole = role && ['EDITOR', 'VIEWER'].includes(role) ? role : 'VIEWER';

        const updatedMember = await prisma.boardMember.update({
            where: { userId_boardId: { userId, boardId: id } },
            data: { role: approvedRole },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        // Broadcast role update via Socket.IO
        try {
            const io = getIO();
            io.to(`board:${id}`).emit('MEMBER_ROLE_UPDATED', {
                boardId: id,
                userId,
                role: approvedRole,
                updatedBy: {
                    userId: req.userId,
                    email: req.userEmail
                },
                user: updatedMember.user
            });
        } catch (socketError) {
            console.error('[Boards] Failed to broadcast approval:', socketError);
        }

        res.json(updatedMember);
    } catch (error) {
        console.error('[Boards] Approve member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Board Settings (OWNER only)
router.patch('/:id/settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { requireApproval, name } = req.body;

        // Check if requester is OWNER
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!requesterMembership || requesterMembership.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only board owners can change settings' });
        }

        const updateData: any = {};
        if (typeof requireApproval === 'boolean') {
            updateData.requireApproval = requireApproval;
        }
        if (name) {
            updateData.name = name;
        }

        const updatedBoard = await prisma.board.update({
            where: { id },
            data: updateData
        });

        // Broadcast settings change via Socket.IO
        try {
            const io = getIO();
            io.to(`board:${id}`).emit('BOARD_SETTINGS_UPDATED', {
                boardId: id,
                settings: updateData,
                updatedBy: {
                    userId: req.userId,
                    email: req.userEmail
                }
            });
        } catch (socketError) {
            console.error('[Boards] Failed to broadcast settings update:', socketError);
        }

        res.json(updatedBoard);
    } catch (error) {
        console.error('[Boards] Update settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add Member to Board
router.post('/:id/members', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;

        // Check if requester is OWNER
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!requesterMembership || requesterMembership.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only board owners can add members' });
        }

        const member = await prisma.boardMember.create({
            data: { boardId: id, userId, role: role || 'VIEWER' },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        // Broadcast new member via Socket.IO
        try {
            const io = getIO();
            io.to(`board:${id}`).emit('MEMBER_JOINED', {
                userId: member.userId,
                email: member.user.email,
                name: member.user.name,
                role: member.role
            });
        } catch (socketError) {
            console.error('[Boards] Failed to broadcast new member:', socketError);
        }

        res.json(member);
    } catch (error) {
        console.error('[Boards] Add member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Board
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const membership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!membership || membership.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only board owners can delete boards' });
        }

        await prisma.board.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('[Boards] Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Board Activity (OWNER and EDITOR only)
router.get('/:id/activity', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        // Check if requester has permission
        const requesterMembership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } }
        });

        if (!requesterMembership) {
            return res.status(403).json({ error: 'You are not a member of this board' });
        }

        if (requesterMembership.role === 'VIEWER') {
            return res.status(403).json({ error: 'Viewers cannot view board activity' });
        }

        // Get recent operations with user info
        const ops = await prisma.boardOp.findMany({
            where: { boardId: id },
            orderBy: { serverSeq: 'desc' },
            take: limit,
            select: {
                id: true,
                serverSeq: true,
                opType: true,
                opData: true,
                userId: true,
                userName: true,
                userEmail: true,
                createdAt: true
            }
        });

        // Get recent member joins/leaves (we can infer from membership creation)
        const recentMembers = await prisma.boardMember.findMany({
            where: { boardId: id },
            orderBy: { id: 'desc' },
            take: 20,
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        // Combine and format activity
        const activity = {
            operations: ops.map(op => ({
                type: 'operation',
                id: op.id,
                serverSeq: op.serverSeq,
                opType: op.opType,
                opData: op.opData,
                user: {
                    id: op.userId,
                    name: op.userName,
                    email: op.userEmail
                },
                timestamp: op.createdAt
            })),
            members: recentMembers.map(m => ({
                type: 'member',
                event: 'joined',
                user: m.user,
                role: m.role,
                timestamp: m.createdAt
            }))
        };

        res.json(activity);
    } catch (error) {
        console.error('[Boards] Get activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request Edit Access (VIEWER only)
router.post('/:id/request-access', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        // Check if user is a member
        const membership = await prisma.boardMember.findUnique({
            where: { userId_boardId: { userId: req.userId!, boardId: id } },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this board' });
        }

        if (membership.role !== 'VIEWER') {
            return res.status(400).json({ error: 'Only viewers can request edit access' });
        }

        // Find the owner
        const owner = await prisma.boardMember.findFirst({
            where: { boardId: id, role: 'OWNER' },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        if (!owner) {
            return res.status(400).json({ error: 'No owner found for this board' });
        }

        // Broadcast request to all members via Socket.IO
        try {
            const io = getIO();
            io.to(`board:${id}`).emit('EDIT_ACCESS_REQUESTED', {
                boardId: id,
                userId: req.userId,
                email: req.userEmail,
                name: membership.user.name,
                message: message || '',
                requestedAt: Date.now()
            });
        } catch (socketError) {
            console.error('[Boards] Failed to broadcast access request:', socketError);
        }

        res.json({
            success: true,
            message: 'Edit access request sent to board owner',
            request: {
                userId: req.userId,
                email: req.userEmail,
                name: membership.user.name,
                boardId: id,
                requestedAt: Date.now()
            }
        });
    } catch (error) {
        console.error('[Boards] Request access error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
