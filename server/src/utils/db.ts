import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to the SQLite database
const sqlitePath = path.resolve(__dirname, '../../prisma/dev.db');
const dbUrl = 'file:' + sqlitePath;
console.log('[DB] Connecting to:', dbUrl);

// In Prisma 7, PrismaBetterSqlite3 is a factory that takes the config
const adapter = new PrismaBetterSqlite3({ url: dbUrl });

// @ts-ignore
export const prisma = new PrismaClient({ adapter });

export async function connectDB() {
    try {
        await prisma.$connect();
        console.log('[DB] Connected successfully via Prisma 7 Adapter');
    } catch (err) {
        console.error('[DB] Connection error:', err);
        throw err;
    }
}

export async function disconnectDB() {
    await prisma.$disconnect();
}
