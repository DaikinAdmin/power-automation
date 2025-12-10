import type { PrismaConfig } from "prisma";
import "dotenv/config";

// Use DATABASE_URL from environment (Docker Compose provides it)
const config: PrismaConfig = {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: { 
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
};

export default config;
