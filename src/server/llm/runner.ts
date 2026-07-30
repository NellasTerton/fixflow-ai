import {
  llmStructuredOutputSchema,
  type LlmAnalysisResult,
  type LlmCompletionRequest,
  type LlmProvider,
} from "./contracts";
import { LlmProviderUnavailableError } from "./errors";

export const LLM_CONFIDENCE_THRESHOLD = 0.7;
export const LLM_TIMEOUT_MS = 7_000;

export async function runLlmAnalysis(
  provider: LlmProvider,
  request: LlmCompletionRequest,
  options: {
    timeoutMs?: number;
    confidenceThreshold?: number;
  } = {},
): Promise<LlmAnalysisResult> {
  const startedAt = performance.now();
  const timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;
  const confidenceThreshold =
    options.confidenceThreshold ?? LLM_CONFIDENCE_THRESHOLD;
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const raw = await Promise.race([
      provider.complete(request, controller.signal),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new LlmTimeoutError());
        }, timeoutMs);
      }),
    ]);

    let json: unknown;

    try {
      json = parseJsonObject(raw);
    } catch {
      return failure(provider.model, startedAt, "invalid_json");
    }

    const parsed = llmStructuredOutputSchema.safeParse(json);

    if (!parsed.success) {
      return failure(provider.model, startedAt, "invalid_schema");
    }

    if (parsed.data.confidence < confidenceThreshold) {
      return failure(
        provider.model,
        startedAt,
        "low_confidence",
        parsed.data,
      );
    }

    return {
      status: "success",
      model: provider.model,
      durationMs: elapsed(startedAt),
      output: parsed.data,
      error: null,
    };
  } catch (error) {
    const code =
      error instanceof LlmTimeoutError ||
      (error instanceof Error && error.name === "AbortError")
        ? "timeout"
        : error instanceof LlmProviderUnavailableError
          ? "provider_unavailable"
          : "provider_unavailable";

    return failure(provider.model, startedAt, code);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function parseJsonObject(raw: string) {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start < 0 || end < start) {
    throw new SyntaxError("No JSON object found");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

export function unconfiguredLlmResult(): LlmAnalysisResult {
  return {
    status: "error",
    model: "unconfigured",
    durationMs: 0,
    output: null,
    error: "provider_unconfigured",
  };
}

function failure(
  model: string,
  startedAt: number,
  error: Extract<LlmAnalysisResult, { status: "error" }>["error"],
  output: Extract<LlmAnalysisResult, { status: "error" }>["output"] = null,
): LlmAnalysisResult {
  return {
    status: "error",
    model,
    durationMs: elapsed(startedAt),
    output,
    error,
  };
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

class LlmTimeoutError extends Error {
  constructor() {
    super("LLM timeout");
    this.name = "LlmTimeoutError";
  }
}
