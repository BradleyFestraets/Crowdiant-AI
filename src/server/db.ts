import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma";
import { logger } from "./logger";

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  // Monitor slow queries
  client.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const duration = Date.now() - before;

    if (duration > 1000) {
      logger.warn(
        {
          model: params.model,
          action: params.action,
          duration,
        },
        "Slow query detected"
      );
    }

    return result;
  });

  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
