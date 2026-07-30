export class LlmProviderUnavailableError extends Error {
  constructor() {
    super("LLM provider unavailable");
    this.name = "LlmProviderUnavailableError";
  }
}

