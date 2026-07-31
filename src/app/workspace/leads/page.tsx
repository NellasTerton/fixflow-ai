import { KanbanBoard } from "@/components/crm/kanban-board";
import { DemoPageHeader } from "@/components/crm/page-parts";
import { listPublicLeads } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listPublicLeads();

  return (
    <>
      <DemoPageHeader
        eyebrow="Операционный обзор"
        title="Заявки FixFlow Service"
        description="Kanban обновляется из Neon каждые 10 секунд. Карточки открываются для просмотра статуса, истории и AI-логики каждой заявки."
      />
      <KanbanBoard
        initialLeads={leads}
        initialRefreshedAt={new Date().toISOString()}
      />
    </>
  );
}
