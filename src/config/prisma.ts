import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances in dev (hot-reload) from exhausting connections
declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
