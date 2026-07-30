export const crmCategories = [
  "appliance_repair",
  "plumbing",
  "air_conditioning",
  "common",
] as const;

export const crmLeadStatuses = [
  "new",
  "qualifying",
  "waiting_booking",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "human_required",
] as const;

export const crmPriorities = ["low", "normal", "high", "urgent"] as const;
export const crmSources = ["seed", "website_form", "ai_chat"] as const;

export type CrmCategory = (typeof crmCategories)[number];
export type CrmLeadStatus = (typeof crmLeadStatuses)[number];
export type CrmPriority = (typeof crmPriorities)[number];
export type CrmSource = (typeof crmSources)[number];

export const categoryLabels: Record<CrmCategory, string> = {
  appliance_repair: "Бытовая техника",
  plumbing: "Сантехника",
  air_conditioning: "Кондиционеры",
  common: "Общее",
};

export const statusLabels: Record<CrmLeadStatus, string> = {
  new: "Новые",
  qualifying: "Квалификация",
  waiting_booking: "Ожидают времени",
  booked: "Записаны",
  in_progress: "В работе",
  completed: "Завершены",
  cancelled: "Отменены",
  human_required: "Нужен оператор",
};

export const priorityLabels: Record<CrmPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export const sourceLabels: Record<CrmSource, string> = {
  seed: "Seed",
  website_form: "Форма",
  ai_chat: "AI-чат",
};

export const publicDemoNavigation = [
  { href: "/demo/crm", label: "Заявки" },
  { href: "/demo/knowledge", label: "База знаний" },
  { href: "/demo/ai-runs", label: "AI runs" },
  { href: "/demo/automations", label: "Автоматизации" },
] as const;

export function isPublicDemoPath(pathname: string) {
  return (
    pathname === "/demo/crm" ||
    pathname === "/demo/knowledge" ||
    pathname === "/demo/ai-runs" ||
    pathname === "/demo/automations" ||
    /^\/demo\/leads\/[^/]+$/.test(pathname)
  );
}
