import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "crowdiant-os",
    environment: process.env.NODE_ENV,
    checks: {
      database: "unknown" as "healthy" | "unhealthy" | "unknown",
    },
  };

  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`;
    checks.checks.database = "healthy";
  } catch (error) {
    checks.checks.database = "unhealthy";
    checks.status = "unhealthy";
  }

  const statusCode = checks.status === "healthy" ? 200 : 503;

  return Response.json(checks, { status: statusCode });
}
