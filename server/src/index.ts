import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './utils/db.js';
import { initializeSocketServer } from './socket/index.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);

// Serve frontend in production
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));

// Handle client-side routing
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            // In dev mode, this might fail if dist doesn't exist, which is fine
            res.status(404).json({ error: 'Not found' });
        }
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
    try {
        await connectDB();
        initializeSocketServer(httpServer);

        httpServer.listen(PORT, () => {
            console.log(`[Server] Running on http://localhost:${PORT}`);
            console.log(`[Server] API: http://localhost:${PORT}/api`);
            console.log(`[Server] Socket.IO: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

start();
