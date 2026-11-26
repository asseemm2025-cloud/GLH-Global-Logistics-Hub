import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn','error'] : ['error'],
  errorFormat: 'minimal'
});
let connected = false;
export async function connectDatabase() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  connected = true;
  return true;
}
export async function disconnectDatabase() {
  connected = false;
  await prisma.$disconnect();
}
export function databaseConnected() { return connected; }
