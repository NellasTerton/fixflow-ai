import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { migrationEnvSchema } from "./src/env/schema";

loadEnvConfig(process.cwd());

const env = migrationEnvSchema.parse({
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
});

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL_DIRECT,
  },
  strict: true,
  verbose: true,
});
