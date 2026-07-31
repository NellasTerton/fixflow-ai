import { BookOpen, FileText } from "lucide-react";

import {
  DataBadge,
  DemoPageHeader,
  EmptyState,
} from "@/components/crm/page-parts";
import { categoryLabels } from "@/lib/crm/constants";
import { formatDateTime } from "@/lib/crm/presentation";
import { listPublicDocuments } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const documents = await listPublicDocuments();

  return (
    <>
      <DemoPageHeader
        eyebrow="RAG-контент"
        title="База знаний"
        description="Документы из Neon, по которым AI-диспетчер отвечает клиентам. Здесь нет локальных mock-массивов или скрытого контента."
      />

      {documents.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            icon={BookOpen}
            title="Документы ещё не добавлены"
            description="Когда демонстрационный RAG-контент появится в Neon, он автоматически отобразится на этой странице."
          />
        </div>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-[#102328]/10 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f5ce] text-[#315b2d]">
                  <FileText className="size-5" aria-hidden="true" />
                </span>
                <DataBadge tone={document.status === "published" ? "green" : "neutral"}>
                  {document.status}
                </DataBadge>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#477233]">
                {categoryLabels[document.category]}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#102328]">
                {document.title}
              </h2>
              <p className="mt-3 line-clamp-6 text-sm leading-6 text-[#5f6e72]">
                {document.contentPreview}
              </p>
              <p className="mt-5 text-xs text-[#849093]">
                Обновлён {formatDateTime(document.updatedAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
