import express from 'express';
import { prisma } from '../utils/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

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

// Get Board by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const membership = await prisma.boardMember.findUnique({
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

        if (!membership) {
            return res.status(404).json({ error: 'Board not found or access denied' });
        }

        res.json({ ...membership.board, userRole: membership.role });
    } catch (error) {
        console.error('[Boards] Get error:', error);
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

export default router;
