import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const getConnectionString = () => {
  if (!process.env.DATABASE_URL) return undefined;
  
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('sslmode', 'no-verify');
  return url.toString();
};

const connectionString = getConnectionString();

const prisma = connectionString
  ? new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
      }),
    })
  : new PrismaClient();

export default prisma;