import { z } from "zod";

import { chatActions } from "../../lib/chat/contracts";
import { crmCategories } from "../../lib/crm/constants";

export const llmIntentValues = [
  "service_request",
  "information_request",
  "human_handoff",
  "other",
] as const;

export const llmStructuredOutputSchema = z.strictObject({
  reply: z.string().trim().min(1).max(600),
  intent: z.enum(llmIntentValues),
  category: z.enum(crmCategories).nullable(),
  confidence: z.number().min(0).max(1),
  extractedData: z.strictObject({
    problemDescription: z.string().trim().min(1).max(1000).nullable(),
    serviceType: z.string().trim().min(1).max(160).nullable(),
    name: z.string().trim().min(1).max(60).nullable(),
    phone: z.string().trim().min(1).max(30).nullable(),
    address: z.string().trim().min(1).max(120).nullable(),
    preferredDate: z.string().date().nullable(),
  }),
  proposedAction: z.enum(chatActions),
});

export type LlmStructuredOutput = z.infer<
  typeof llmStructuredOutputSchema
>;

export interface LlmCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface LlmProvider {
  readonly model: string;
  complete(
    request: LlmCompletionRequest,
    signal: AbortSignal,
  ): Promise<string>;
}

export type LlmFailureCode =
  | "provider_unconfigured"
  | "provider_unavailable"
  | "timeout"
  | "invalid_json"
  | "invalid_schema"
  | "low_confidence";

export type LlmAnalysisResult =
  | {
      status: "success";
      model: string;
      durationMs: number;
      output: LlmStructuredOutput;
      error: null;
    }
  | {
      status: "error";
      model: string;
      durationMs: number;
      output: LlmStructuredOutput | null;
      error: LlmFailureCode;
    };

