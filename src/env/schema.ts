import { z } from "zod";

const postgresUrl = z
  .string()
  .trim()
  .min(1, "Database URL is required")
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "Database URL must use the postgres:// or postgresql:// protocol",
  );

export const applicationEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
});

export const migrationEnvSchema = z.object({
  DATABASE_URL_DIRECT: postgresUrl,
});

export const llmEnvSchema = z.object({
  LLM_BASE_URL: z.url("LLM base URL must be a valid URL"),
  LLM_API_KEY: z.string().trim().min(1, "LLM API key is required"),
  LLM_MODEL: z.string().trim().min(1, "LLM model is required"),
});
