import { db } from "~/server/db";

export async function GET() {
  try {
    // Execute simple query to verify database connectivity
    await db.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      service: "database",
      timestamp: Date.now(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        service: "database",
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      },
      { status: 503 },
    );
  }
}
