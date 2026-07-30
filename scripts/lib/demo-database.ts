import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";

import { applicationEnvSchema } from "../../src/env/schema";
import * as schema from "../../src/server/db/schema";

loadEnvConfig(process.cwd());

const env = applicationEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});

export const demoDatabase = drizzle(env.DATABASE_URL, { schema });
