import { db } from "@/server/db";
import { checkDatabaseConnection } from "@/server/db/health";

export const runtime = "nodejs";

export async function GET() {
  try {
    const health = await checkDatabaseConnection(db);

    return Response.json(health);
  } catch (error) {
    console.error(
      "Database health check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return Response.json(
      {
        status: "error",
        database: "unavailable",
      },
      { status: 503 },
    );
  }
}
