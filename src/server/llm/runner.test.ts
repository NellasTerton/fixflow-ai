import { describe, expect, it } from "vitest";

import { createMockLlmProvider } from "./mock-provider";
import { LlmProviderUnavailableError } from "./errors";
import { runLlmAnalysis } from "./runner";

const request = {
  systemPrompt: "Return JSON",
  userPrompt: "Demo request",
};

describe("LLM structured analysis", () => {
  it("accepts a valid high-confidence response", async () => {
    const result = await runLlmAnalysis(
      createMockLlmProvider({ response: validOutput(0.91) }),
      request,
    );

    expect(result.status).toBe("success");
    expect(result.output?.category).toBe("plumbing");
  });

  it("rejects invalid JSON for deterministic fallback", async () => {
    const result = await runLlmAnalysis(
      createMockLlmProvider({ response: "not-json" }),
      request,
    );

    expect(result).toMatchObject({
      status: "error",
      error: "invalid_json",
      output: null,
    });
  });

  it("times out and aborts the provider", async () => {
    const result = await runLlmAnalysis(
      createMockLlmProvider({ delayMs: 50, response: validOutput(0.95) }),
      request,
      { timeoutMs: 5 },
    );

    expect(result).toMatchObject({
      status: "error",
      error: "timeout",
    });
  });

  it("handles an unavailable provider without exposing its error", async () => {
    const result = await runLlmAnalysis(
      createMockLlmProvider({
        error: new LlmProviderUnavailableError(),
      }),
      request,
    );

    expect(result).toMatchObject({
      status: "error",
      error: "provider_unavailable",
    });
  });

  it("rejects low confidence while keeping validated output for ai_runs", async () => {
    const result = await runLlmAnalysis(
      createMockLlmProvider({ response: validOutput(0.31) }),
      request,
    );

    expect(result).toMatchObject({
      status: "error",
      error: "low_confidence",
    });
    expect(result.output?.confidence).toBe(0.31);
  });

  it("rejects JSON that does not match the Zod schema", async () => {
    const result = await runLlmAnalysis(
      createMockLlmProvider({
        response: JSON.stringify({ reply: "Недостаточно полей" }),
      }),
      request,
    );

    expect(result).toMatchObject({
      status: "error",
      error: "invalid_schema",
    });
  });
});

function validOutput(confidence: number) {
  return JSON.stringify({
    reply: "Уточните, пожалуйста, тип сантехнической услуги?",
    intent: "service_request",
    category: "plumbing",
    confidence,
    extractedData: {
      problemDescription: "В демонстрационной зоне условная протечка.",
      serviceType: null,
      name: null,
      phone: null,
      address: null,
      preferredDate: null,
    },
    proposedAction: "ask_question",
  });
}

