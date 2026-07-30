export interface TextChunk {
  index: number;
  content: string;
}

const TARGET_MIN = 700;
const TARGET_MAX = 1000;
const OVERLAP = 120;

export function chunkKnowledgeText(text: string): TextChunk[] {
  const normalized = text.replace(/\r\n?/gu, "\n").trim();

  if (!normalized) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + TARGET_MAX, normalized.length);

    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n\n", end);
      const sentenceBreak = normalized.lastIndexOf(". ", end);
      const bestBreak = Math.max(paragraphBreak, sentenceBreak);

      if (bestBreak >= start + TARGET_MIN) {
        end = bestBreak + (bestBreak === paragraphBreak ? 2 : 1);
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content) {
      chunks.push({ index: chunks.length, content });
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(start + 1, end - OVERLAP);
  }

  return chunks;
}
