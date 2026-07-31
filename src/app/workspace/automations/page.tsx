import { Radio, Workflow } from "lucide-react";

import {
  DataBadge,
  DemoPageHeader,
  EmptyState,
  SectionCard,
} from "@/components/crm/page-parts";
import { formatDateTime } from "@/lib/crm/presentation";
import {
  listPublicAutomationLogs,
  listPublicIntegrationEvents,
} from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const [events, logs] = await Promise.all([
    listPublicIntegrationEvents(),
    listPublicAutomationLogs(),
  ]);

  return (
    <>
      <DemoPageHeader
        eyebrow="Webhook-контур"
        title="Автоматизации"
        description="Next.js только фиксирует и отправляет события. Telegram, расписание, follow-up и напоминания выполняют внешние сценарии Make."
      />

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Integration events" count={events.length}>
          {events.length === 0 ? (
            <EmptyState
              compact
              icon={Radio}
              title="Событий пока нет"
              description="Реальные webhook-события из Neon появятся здесь без rebuild."
            />
          ) : (
            <div className="divide-y divide-[#102328]/8">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-[#102328]">
                      {event.eventType}
                    </h2>
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
                    {event.httpStatus ? ` · ${event.httpStatus}` : ""}
                  </DataBadge>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Automation logs" count={logs.length}>
          {logs.length === 0 ? (
            <EmptyState
              compact
              icon={Workflow}
              title="Логов пока нет"
              description="Make запишет сюда результаты внешних workflow."
            />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-[#102328]/8 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[#102328]">
                        {log.workflowName}
                      </h2>
                      <p className="mt-1 text-xs text-[#7a878a]">
                        {log.platform} · {log.action}
                      </p>
                      {log.externalRunId ? (
                        <p className="mt-1 text-xs text-[#849093]">
                          Run: {log.externalRunId}
                        </p>
                      ) : null}
                    </div>
                    <DataBadge tone={log.status === "success" ? "green" : "amber"}>
                      {log.status}
                    </DataBadge>
                  </div>
                  <p className="mt-3 text-xs text-[#849093]">
                    {log.eventType ?? "event"} ·{" "}
                    {formatDateTime(log.createdAt)}
                  </p>
                  {Object.keys(log.details).length > 0 ? (
                    <p className="mt-2 text-xs text-[#657477]">
                      {Object.entries(log.details)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
