import { sql, type SQL } from "drizzle-orm";

export type DatabaseHealth = {
  status: "ok";
  database: "connected";
};

export interface HealthCheckDatabase {
  execute(query: SQL): Promise<unknown>;
}

export async function checkDatabaseConnection(
  database: HealthCheckDatabase,
): Promise<DatabaseHealth> {
  await database.execute(sql`select 1`);

  return {
    status: "ok",
    database: "connected",
  };
}
