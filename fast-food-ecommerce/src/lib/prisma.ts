import { PrismaClient } from '@prisma/client';

// Tạo PrismaClient global để tránh tạo nhiều kết nối trong môi trường development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Export prisma client
export const prisma = globalForPrisma.prisma || new PrismaClient();

// Trong môi trường development, lưu prisma client vào global object
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} 