import { Bot, BookOpenText, Gauge, Timer } from "lucide-react";

import {
  DataBadge,
  DemoPageHeader,
  EmptyState,
} from "@/components/crm/page-parts";
import { formatDateTime } from "@/lib/crm/presentation";
import { listPublicAiRuns } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function AiRunsPage() {
  const runs = await listPublicAiRuns();

  return (
    <>
      <DemoPageHeader
        eyebrow="Наблюдаемость"
        title="AI runs"
        description="Безопасные технические сводки реальных AI-операций. Промпты, контакты и точные адреса публично не раскрываются."
      />

      {runs.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            icon={Bot}
            title="AI runs ещё не записаны"
            description="Раздел заполнится реальными трассировками после подключения AI-сценария."
          />
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {runs.map((run) => (
            <article
              key={run.id}
              className="grid gap-4 rounded-2xl border border-[#102328]/10 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[#102328]">
                    {run.operation}
                  </h2>
                  <DataBadge tone={run.status === "success" ? "green" : "red"}>
                    {run.status}
                  </DataBadge>
                  {run.leadPublicNumber ? (
                    <span className="font-mono text-xs font-semibold text-[#477233]">
                      {run.leadPublicNumber}
                    </span>
                  ) : null}
                  {run.action ? (
                    <DataBadge tone={run.action === "handoff_to_human" ? "amber" : "blue"}>
                      {run.action}
                    </DataBadge>
                  ) : null}
                </div>
                {run.question ? (
                  <div className="mt-3 rounded-xl bg-[#f5f6f1] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#748184]">
                      Вопрос
                    </p>
                    <p className="mt-1 text-sm text-[#263a3f]">{run.question}</p>
                  </div>
                ) : null}
                <p className="mt-3 max-w-4xl text-sm leading-6 text-[#5f6e72]">
                  {run.inputSummary}
                </p>
                {run.reply ? (
                  <div className="mt-3 rounded-xl border border-[#477233]/15 bg-[#eef4e9] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#477233]">
                      Итоговый ответ
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#263a3f]">
                      {run.reply}
                    </p>
                  </div>
                ) : null}
                {run.retrievedChunks.length > 0 ? (
                  <details className="mt-3 rounded-xl border border-[#102328]/10 p-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#263a3f]">
                      <BookOpenText className="size-4 text-[#477233]" aria-hidden="true" />
                      Найденные chunks · {run.retrievedChunks.length}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {run.retrievedChunks.map((chunk, index) => (
                        <article
                          key={`${chunk.source}-${index}`}
                          className="rounded-lg bg-[#f7f8f3] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs font-semibold text-[#263a3f]">
                              {chunk.title}
                            </p>
                            <span className="font-mono text-xs text-[#477233]">
                              {(chunk.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#5f6e72]">
                            {chunk.content}
                          </p>
                          <p className="mt-2 font-mono text-[10px] text-[#829093]">
                            {chunk.source}
                          </p>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
                {run.error ? (
                  <p className="mt-2 text-sm text-red-700">{run.error}</p>
                ) : null}
              </div>
              <div className="flex gap-5 text-xs text-[#748184] md:flex-col md:items-end md:gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="size-3.5" aria-hidden="true" />
                  {run.model}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Timer className="size-3.5" aria-hidden="true" />
                  {run.durationMs} ms
                </span>
                <time>{formatDateTime(run.createdAt)}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
