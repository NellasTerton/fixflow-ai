import { KanbanBoard } from "@/components/crm/kanban-board";
import { DemoPageHeader } from "@/components/crm/page-parts";
import { listPublicLeads } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const leads = await listPublicLeads();

  return (
    <>
      <DemoPageHeader
        eyebrow="Операционный обзор"
        title="Заявки FixFlow Service"
        description="Read-only Kanban обновляется из Neon каждые 10 секунд. Карточки открываются для просмотра, но их нельзя редактировать или перетаскивать."
      />
      <KanbanBoard
        initialLeads={leads}
        initialRefreshedAt={new Date().toISOString()}
      />
    </>
  );
}
