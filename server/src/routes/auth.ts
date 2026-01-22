import express from 'express';
import { prisma } from '../utils/db.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/auth.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Guest Login
router.post('/guest', async (req, res) => {
    try {
        const { name } = req.body;
        // Generate a random guest email
        const randomId = Math.random().toString(36).substring(2, 10);
        const email = `guest_${Date.now()}_${randomId}@collabcanvas.com`;

        // Hash a dummy password
        const hashedPassword = await hashPassword('guest_password');

        const user = await prisma.user.create({
            data: {
                email,
                name: name || 'Guest',
                password: hashedPassword
            },
            select: { id: true, email: true, name: true, createdAt: true, orgId: true }
        });

        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        res.json({ user, accessToken, refreshToken });
    } catch (error) {
        console.error('[Auth] Guest login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, name, password } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: { email, name, password: hashedPassword },
            select: { id: true, email: true, name: true, createdAt: true }
        });

        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        res.json({ user, accessToken, refreshToken });
    } catch (error) {
        console.error('[Auth] Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await comparePassword(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        res.json({
            user: { id: user.id, email: user.email, name: user.name },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        const newAccessToken = generateAccessToken({
            userId: tokenRecord.user.id,
            email: tokenRecord.user.email
        });

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        console.error('[Auth] Refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Get Current User
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, email: true, name: true, createdAt: true, orgId: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[Auth] Me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
