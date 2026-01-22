import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDB() {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL');
}

export async function disconnectDB() {
    await prisma.$disconnect();
    console.log('[DB] Disconnected from PostgreSQL');
}
