import type {
  LlmCompletionRequest,
  LlmProvider,
} from "./contracts";

export function createMockLlmProvider(options: {
  response?: string;
  error?: Error;
  delayMs?: number;
  model?: string;
}): LlmProvider {
  return {
    model: options.model ?? "mock-claude",
    async complete(
      _request: LlmCompletionRequest,
      signal: AbortSignal,
    ) {
      if (options.delayMs) {
        await wait(options.delayMs, signal);
      }

      if (options.error) {
        throw options.error;
      }

      return options.response ?? "";
    },
  };
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

