import "server-only";

import { applicationEnvSchema } from "@/env/schema";

export const serverEnv = applicationEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
