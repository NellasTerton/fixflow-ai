import type { KnowledgeSource } from "./types";

export function isRagAnswerGrounded(
  question: string,
  reply: string,
  sources: KnowledgeSource[],
) {
  if (sources.length === 0) {
    return false;
  }

  const context = sources.map((source) => source.content).join("\n");
  const answerNumbers =
    reply.replace(/\[\d+\]/gu, "").match(/\d[\d\s]*(?:[.,]\d+)?/gu) ?? [];

  for (const value of answerNumbers) {
    const normalized = value.replace(/\s+/gu, "");
    if (!context.replace(/\s+/gu, "").includes(normalized)) {
      return false;
    }
  }

  if (/пожизн/iu.test(reply) && !/пожизн/iu.test(context)) {
    return false;
  }

  if (
    /(?:точная\s+цена|окончательная\s+стоимость)\s+(?:составляет|составит|—|:)\s*\d/iu.test(
      reply,
    )
  ) {
    return false;
  }

  if (/гаран/iu.test(question) && !/гаран/iu.test(context)) {
    return false;
  }

  if (
    /(?:район|адрес|зон.{0,12}обслуж)/iu.test(question) &&
    !/(?:район|зон.{0,12}обслуж)/iu.test(context)
  ) {
    return false;
  }

  return true;
}
