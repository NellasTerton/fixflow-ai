import {
  ArrowLeft,
  Bot,
  BookOpenText,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  MessagesSquare,
  Radio,
  UserRound,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  DataBadge,
  EmptyState,
  SectionCard,
} from "@/components/crm/page-parts";
import {
  categoryLabels,
  priorityLabels,
  sourceLabels,
  statusLabels,
} from "@/lib/crm/constants";
import {
  formatDateTime,
  formatPreferredTime,
  formatPriceRange,
} from "@/lib/crm/presentation";
import { getPublicLeadDetail } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!idSchema.safeParse(id).success) {
    notFound();
  }

  const lead = await getPublicLeadDetail(id);

  if (!lead) {
    notFound();
  }

  const displayedTime = lead.bookingStartsAt
    ? formatDateTime(lead.bookingStartsAt)
    : formatPreferredTime(lead.preferredDate, lead.preferredTime);

  return (
    <>
      <Link
        href="/demo/crm"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#477233] hover:text-[#315b2d]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Вернуться к Kanban
      </Link>

      <header className="mt-6 rounded-3xl bg-[#102328] p-6 text-white shadow-xl shadow-[#102328]/10 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#bbf451]">
                {lead.publicNumber}
              </span>
              <DataBadge tone="green">{statusLabels[lead.status]}</DataBadge>
              <DataBadge tone={lead.priority === "urgent" ? "red" : "amber"}>
                {priorityLabels[lead.priority]}
              </DataBadge>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {lead.serviceType}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/65">
              {lead.problemDescription}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.15em] text-white/40">
              Оценка
            </p>
            <p className="mt-1 text-xl font-semibold text-[#d9ff98]">
              {formatPriceRange(
                lead.estimatedPriceFrom,
                lead.estimatedPriceTo,
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={UserRound}
          label="Клиент"
          value={lead.customerName}
          meta={`${lead.maskedPhone} · ${lead.addressSummary}`}
        />
        <InfoCard
          icon={CalendarClock}
          label="Время"
          value={displayedTime}
          meta={lead.bookingStartsAt ? "Подтверждённая запись" : "Предпочтение"}
        />
        <InfoCard
          icon={CircleDollarSign}
          label="Категория"
          value={categoryLabels[lead.category]}
          meta={`Источник: ${sourceLabels[lead.source]}`}
        />
        <InfoCard
          icon={Clock3}
          label="Обновлена"
          value={formatDateTime(lead.updatedAt)}
          meta="Время показано в UTC"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="История сообщений" count={lead.messages.length}>
          {lead.messages.length === 0 ? (
            <EmptyState
              compact
              icon={MessagesSquare}
              title="Сообщений пока нет"
              description="История появится после реального диалога клиента с AI-диспетчером."
            />
          ) : (
            <div className="space-y-3">
              {lead.messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-xl bg-[#f5f6f1] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <DataBadge tone={message.sender === "customer" ? "blue" : "green"}>
                      {message.sender === "customer"
                        ? "Клиент"
                        : message.sender === "assistant"
                          ? "AI"
                          : "Система"}
                    </DataBadge>
                    <time className="text-xs text-[#7a878a]">
                      {formatDateTime(message.createdAt)}
                    </time>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#43555a]">
                    {message.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Почему AI так ответил?" count={lead.aiRuns.length}>
          {lead.aiRuns.length === 0 ? (
            <EmptyState
              compact
              icon={Bot}
              title="AI-запусков пока нет"
              description="Здесь появятся реальные трассировки классификации и RAG."
            />
          ) : (
            <div className="space-y-3">
              {lead.aiRuns.map((run) => (
                <article
                  key={run.id}
                  className="rounded-xl border border-[#102328]/8 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#102328]">
                      {run.operation}
                    </p>
                    <DataBadge tone={run.status === "success" ? "green" : "red"}>
                      {run.status}
                    </DataBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6e72]">
                    {run.inputSummary}
                  </p>
                  {run.reply ? (
                    <p className="mt-3 rounded-lg bg-[#eef4e9] p-3 text-sm leading-6 text-[#263a3f]">
                      {run.reply}
                    </p>
                  ) : null}
                  {run.retrievedChunks.length > 0 ? (
                    <details className="mt-3 rounded-lg border border-[#102328]/8 p-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#477233]">
                        <BookOpenText className="size-4" aria-hidden="true" />
                        Источники · {run.retrievedChunks.length}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {run.retrievedChunks.map((chunk, index) => (
                          <p
                            key={`${chunk.source}-${index}`}
                            className="text-xs leading-5 text-[#5f6e72]"
                          >
                            {chunk.title} · {(chunk.similarity * 100).toFixed(1)}%
                          </p>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <p className="mt-3 text-xs text-[#7a878a]">
                    {run.model} · {run.durationMs} ms ·{" "}
                    {formatDateTime(run.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Integration events"
          count={lead.integrationEvents.length}
        >
          {lead.integrationEvents.length === 0 ? (
            <EmptyState
              compact
              icon={Radio}
              title="Webhook-событий пока нет"
              description="События появятся после отправки реального webhook из Next.js."
            />
          ) : (
            <div className="divide-y divide-[#102328]/8">
              {lead.integrationEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#102328]">
                      {event.eventType}
                    </p>
                    <p className="mt-1 text-xs text-[#7a878a]">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                  <DataBadge
                    tone={
                      event.deliveryStatus === "delivered"
                        ? "green"
                        : event.deliveryStatus === "failed"
                          ? "red"
                          : "amber"
                    }
                  >
                    {event.deliveryStatus}
                    {event.httpStatus ? ` · HTTP ${event.httpStatus}` : ""}
                  </DataBadge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Automation logs" count={lead.automationLogs.length}>
          {lead.automationLogs.length === 0 ? (
            <EmptyState
              compact
              icon={Workflow}
              title="Автоматизации пока не запускались"
              description="Make или n8n запишут сюда Telegram, задержки и follow-up."
            />
          ) : (
            <div className="space-y-3">
              {lead.automationLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-[#102328]/8 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#102328]">
                        {log.workflowName}
                      </p>
                      <p className="mt-1 text-xs text-[#7a878a]">
                        {log.platform} · {log.action}
                      </p>
                    </div>
                    <DataBadge tone={log.status === "success" ? "green" : "amber"}>
                      {log.status}
                    </DataBadge>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <article className="rounded-2xl border border-[#102328]/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b777a]">
        <Icon className="size-4 text-[#477233]" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 text-[#102328]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#7a878a]">{meta}</p>
    </article>
  );
}
