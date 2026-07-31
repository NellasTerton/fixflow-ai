import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/crm/page-parts";

export default function LeadNotFound() {
  return (
    <div className="mx-auto max-w-xl py-12">
      <EmptyState
        icon={FileQuestion}
        title="Заявка не найдена"
        description="В рабочем пространстве доступны только существующие заявки."
      />
      <div className="mt-5 text-center">
        <Link
          href="/workspace/leads"
          className="text-sm font-semibold text-[#477233] hover:underline"
        >
          Вернуться к Kanban
        </Link>
      </div>
    </div>
  );
}
