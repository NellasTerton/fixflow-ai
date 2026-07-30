import "server-only";

import { z } from "zod";

import { llmEnvSchema } from "../../env/schema";
import type {
  LlmCompletionRequest,
  LlmProvider,
} from "./contracts";
import { LlmProviderUnavailableError } from "./errors";

const anthropicResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
    }),
  ),
});

export function createAnthropicProvider(): LlmProvider | null {
  const parsed = llmEnvSchema.safeParse({
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
  });

  if (!parsed.success) {
    return null;
  }

  const endpoint = createMessagesEndpoint(parsed.data.LLM_BASE_URL);

  return {
    model: parsed.data.LLM_MODEL,
    async complete(
      request: LlmCompletionRequest,
      signal: AbortSignal,
    ) {
      let response: Response;

      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "x-api-key": parsed.data.LLM_API_KEY,
          },
          body: JSON.stringify({
            model: parsed.data.LLM_MODEL,
            max_tokens: 800,
            system: request.systemPrompt,
            messages: [{ role: "user", content: request.userPrompt }],
          }),
          cache: "no-store",
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        throw new LlmProviderUnavailableError();
      }

      if (!response.ok) {
        throw new LlmProviderUnavailableError();
      }

      const parsedResponse = anthropicResponseSchema.safeParse(
        await response.json(),
      );
      const text = parsedResponse.success
        ? parsedResponse.data.content.find(
            (block) => block.type === "text" && block.text,
          )?.text
        : null;

      if (!text) {
        throw new LlmProviderUnavailableError();
      }

      return text;
    },
  };
}

function createMessagesEndpoint(baseUrl: string) {
  const url = new URL(baseUrl);
  const normalizedPath = url.pathname.replace(/\/+$/u, "");

  if (!normalizedPath.endsWith("/v1/messages")) {
    url.pathname = (
      normalizedPath.endsWith("/v1")
        ? `${normalizedPath}/messages`
        : `${normalizedPath}/v1/messages`
    ).replace(/^\/{2,}/u, "/");
  }

  return url.toString();
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
