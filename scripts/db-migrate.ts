import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { migrationEnvSchema } from "../src/env/schema";

loadEnvConfig(process.cwd());

async function main() {
  const env = migrationEnvSchema.parse({
    DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
  });
  const database = drizzle(env.DATABASE_URL_DIRECT);

  await migrate(database, { migrationsFolder: "./drizzle" });
  console.log("Drizzle migrations applied through Neon HTTP.");
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? sanitizeMessage(error.message) : "Unknown error";
  const cause =
    error instanceof Error &&
    "cause" in error &&
    error.cause instanceof Error
      ? ` Cause: ${sanitizeMessage(error.cause.message)}`
      : "";
  console.error(`Drizzle migration failed: ${message}${cause}`);
  process.exitCode = 1;
});

function sanitizeMessage(message: string) {
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/giu, "[database-url-redacted]")
    .replace(/password=[^\s]+/giu, "password=[redacted]");
}
