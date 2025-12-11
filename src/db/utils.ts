import prisma from "./index";

/**
 * Safely execute a database query with automatic connection management
 * This ensures connections are properly handled in serverless environments
 */
export async function withPrisma<T>(
  callback: () => Promise<T>
): Promise<T> {
  try {
    const result = await callback();
    return result;
  } catch (error) {
    console.error("Database operation failed:", error);
    throw error;
  } finally {
    // In serverless/edge environments, connections should be managed per request
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      await prisma.$disconnect();
    }
  }
}

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

/**
 * Get database connection info (for monitoring)
 */
export async function getDatabaseInfo() {
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    return {
      activeConnections: Number(result[0]?.count || 0),
    };
  } catch (error) {
    console.error("Failed to get database info:", error);
    return null;
  }
}
