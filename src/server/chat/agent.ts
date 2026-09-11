import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { llmEnvSchema } from "../../env/schema";
import { saveChatAgentRun } from "./ai-run-store";
import { buildSystemPrompt } from "./system-prompt";
import {
  bookSlot,
  CHAT_TOOLS,
  checkAvailability,
  createLead,
} from "./tools";

// One user message rarely needs more than one or two tool calls before a
// final reply — this is a circuit breaker against a runaway loop, not a
// realistic conversation length.
const MAX_TOOL_ITERATIONS = 4;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface AgentTurnResult {
  reply: string;
  leadId?: string;
  publicNumber?: string;
  bookingId?: string;
}

function createClient(): Anthropic | null {
  const parsed = llmEnvSchema.safeParse({
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
  });

  if (!parsed.success) {
    return null;
  }

  return new Anthropic({
    apiKey: parsed.data.LLM_API_KEY,
    baseURL: parsed.data.LLM_BASE_URL,
  });
}

/**
 * One tool-calling turn: Claude drives the whole conversation (what to ask,
 * in what order) and calls create_lead/check_availability/book_slot itself
 * when it has what it needs. This replaces the old deterministic FSM +
 * separate RAG branch entirely — there is no intermediate state machine
 * translating between an LLM classification and hand-rolled steps, so there
 * is nothing for a RAG answer and an FSM prompt to disagree about anymore.
 *
 * Never throws — any failure becomes a plain-language reply, matching how
 * the rest of this app already treats the LLM as unreliable infrastructure.
 */
export async function runAgentTurn(
  conversationId: string,
  userMessage: string,
  history: ChatMessage[],
  activeLead: { publicNumber: string } | null,
): Promise<AgentTurnResult> {
  const startedAt = Date.now();
  const toolsCalled: string[] = [];
  const model = process.env.LLM_MODEL ?? "claude-sonnet-5";
  const outcome = await runLoop(
    conversationId,
    userMessage,
    history,
    activeLead,
    toolsCalled,
  );

  try {
    await saveChatAgentRun({
      conversationId,
      model,
      messageChars: userMessage.length,
      toolsCalled,
      reply: outcome.reply,
      durationMs: Date.now() - startedAt,
      status: outcome.failed ? "error" : "success",
      error: outcome.failed ? "agent_turn_failed" : null,
    });
  } catch {
    console.error("AI run persistence failed");
  }

  return outcome;
}

async function runLoop(
  conversationId: string,
  userMessage: string,
  history: ChatMessage[],
  activeLead: { publicNumber: string } | null,
  toolsCalled: string[],
): Promise<AgentTurnResult & { failed?: boolean }> {
  const client = createClient();

  if (!client) {
    return {
      reply:
        "Диспетчер временно недоступен технически. Попробуйте, пожалуйста, чуть позже.",
      failed: true,
    };
  }

  const model = process.env.LLM_MODEL ?? "claude-sonnet-5";
  const systemPrompt = await buildSystemPrompt(activeLead);
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];
  const outcome: AgentTurnResult = { reply: "" };

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        // Adaptive thinking at low effort avoids a defect seen in practice
        // (and documented the same way in fitness-agent, the project this
        // design is modeled on): with thinking off, the model sometimes
        // writes a tool call as visible text instead of a real tool_use
        // block, leaking raw call syntax into the customer-facing reply.
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: CHAT_TOOLS,
        messages,
      });

      if (response.stop_reason === "refusal") {
        outcome.reply =
          "Извините, не могу ответить на этот запрос. Попробуйте переформулировать вопрос.";
        return outcome;
      }

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text",
        );
        outcome.reply = textBlock?.text ?? "";
        return outcome;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        toolsCalled.push(toolUse.name);
        const result = await runTool(conversationId, toolUse, outcome);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result.output),
          is_error: result.isError,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    outcome.reply =
      "Извините, не получилось обработать запрос с первой попытки. Попробуйте, пожалуйста, ещё раз.";
    return { ...outcome, failed: true };
  } catch (error) {
    outcome.reply = describeError(error);
    return { ...outcome, failed: true };
  }
}

async function runTool(
  conversationId: string,
  toolUse: Anthropic.ToolUseBlock,
  outcome: AgentTurnResult,
): Promise<{ output: unknown; isError: boolean }> {
  try {
    switch (toolUse.name) {
      case "check_availability": {
        const output = await checkAvailability(toolUse.input);
        return { output, isError: false };
      }
      case "create_lead": {
        const output = await createLead(conversationId, toolUse.input);
        if (typeof output.lead_id === "string") {
          outcome.leadId = output.lead_id;
          outcome.publicNumber = String(output.public_number ?? "");
        }
        return { output, isError: Boolean(output.error) };
      }
      case "book_slot": {
        const output = await bookSlot(toolUse.input);
        if (typeof output.booking_id === "string") {
          outcome.bookingId = output.booking_id;
        }
        return { output, isError: Boolean(output.error) };
      }
      default:
        return {
          output: { error: `Неизвестный инструмент: ${toolUse.name}` },
          isError: true,
        };
    }
  } catch (error) {
    console.error(`Tool ${toolUse.name} failed:`, error);
    return {
      output: {
        error:
          "Техническая ошибка при выполнении действия. Извинись перед клиентом и предложи связаться с оператором напрямую.",
      },
      isError: true,
    };
  }
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic auth error:", error.message);
    return "Ошибка авторизации у AI-провайдера — сообщите администратору.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Сейчас слишком много запросов, попробуйте, пожалуйста, чуть позже.";
  }
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error:", error.status, error.message);
    return "Произошла ошибка при обращении к AI. Попробуйте ещё раз позже.";
  }
  console.error("Unexpected agent error:", error);
  return "Внутренняя ошибка сервера. Попробуйте ещё раз позже.";
}
