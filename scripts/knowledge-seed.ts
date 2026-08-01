import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import { eq } from "drizzle-orm";

import { demoDatabase } from "./lib/demo-database";
import {
  documentChunks,
  documents,
} from "../src/server/db/schema";
import {
  applyKnowledgeSeed,
  type KnowledgeDocumentInput,
  type KnowledgeSeedStore,
} from "../src/server/rag/seed";

const KNOWLEDGE_DIRECTORY = join(process.cwd(), "knowledge", "demo");
// Every source file must carry this marker so a contributor can never seed
// real company content by accident. The marker itself is stripped below
// before chunking — the chunker embeds raw text verbatim, so leaving it in
// would let "Демонстрационные данные вымышленной компании" surface in a
// retrieved chunk and potentially in the chat's answer to a customer.
const DEMO_NOTICE = "Демонстрационные данные вымышленной компании";
const DEMO_NOTICE_LINE = /^>\s*Демонстрационные данные вымышленной компании\.?\s*\n+/mu;

const categories: Record<string, KnowledgeDocumentInput["category"]> = {
  "services-appliances.md": "appliance_repair",
  "prices-appliances.md": "appliance_repair",
  "faq-appliances.md": "appliance_repair",
  "services-plumbing.md": "plumbing",
  "prices-plumbing.md": "plumbing",
  "faq-plumbing.md": "plumbing",
  "services-air-conditioning.md": "air_conditioning",
  "prices-air-conditioning.md": "air_conditioning",
  "faq-air-conditioning.md": "air_conditioning",
  "warranty.md": "common",
  "service-area.md": "common",
  "booking-rules.md": "common",
};

async function main() {
  const inputs = await loadKnowledgeDocuments();
  const result = await applyKnowledgeSeed(createStore(), inputs);
  console.log(
    `FixFlow knowledge seed applied: ${result.documents} documents, ${result.chunks} chunks.`,
  );
}

async function loadKnowledgeDocuments(): Promise<KnowledgeDocumentInput[]> {
  const fileNames = (await readdir(KNOWLEDGE_DIRECTORY))
    .filter((fileName) => [".md", ".txt"].includes(extname(fileName)))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => {
      const category = categories[fileName];
      if (!category) {
        throw new Error(`Knowledge category is not configured for ${fileName}`);
      }

      const content = await readFile(
        join(KNOWLEDGE_DIRECTORY, fileName),
        "utf8",
      );
      if (!content.includes(DEMO_NOTICE)) {
        throw new Error(`Demo notice is missing in ${fileName}`);
      }

      const embeddedContent = content.replace(DEMO_NOTICE_LINE, "");

      return {
        title: firstHeading(content) ?? fileName,
        category,
        source: `knowledge/demo/${fileName}`,
        content: embeddedContent,
      };
    }),
  );
}

function createStore(): KnowledgeSeedStore {
  return {
    async replaceDocument(input) {
      const [document] = await demoDatabase
        .insert(documents)
        .values({
          title: input.title,
          category: input.category,
          content: input.content,
          status: "published",
          isDemo: true,
        })
        .onConflictDoUpdate({
          target: [documents.category, documents.title],
          set: {
            content: input.content,
            status: "published",
            isDemo: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: documents.id });

      if (!document) {
        throw new Error(`Document upsert failed for ${input.source}`);
      }

      await demoDatabase
        .delete(documentChunks)
        .where(eq(documentChunks.documentId, document.id));

      if (input.chunks.length > 0) {
        await demoDatabase.insert(documentChunks).values(
          input.chunks.map((chunk) => ({
            documentId: document.id,
            category: input.category,
            chunkIndex: chunk.index,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: chunk.embedding,
          })),
        );
      }
    },
  };
}

function firstHeading(content: string) {
  return content
    .split(/\r?\n/gu)
    .map((line) => line.match(/^#\s+(.+)$/u)?.[1]?.trim())
    .find(Boolean);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`FixFlow knowledge seed failed: ${message}`);
  process.exitCode = 1;
});
