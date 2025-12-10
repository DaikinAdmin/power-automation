 // define your output folder here
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  // Skip Prisma initialization during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null as any;
  }
  
  // Create adapter for PostgreSQL (required in Prisma v7)
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Disable SSL since database doesn't support it
  });
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Handle graceful shutdown
if (process.env.NODE_ENV === "production" && prisma) {
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default prisma;