import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { serverEnv } from "@/env/server";
import * as schema from "@/server/db/schema";

export const db = drizzle(serverEnv.DATABASE_URL, { schema });
