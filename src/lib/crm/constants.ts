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

/**
 * `primary` items are the day-to-day business surface; `secondary` items are
 * the technical evidence (AI reasoning, webhook/automation logs) — still one
 * click away, but shown de-emphasized so they don't compete with the
 * business nav for attention.
 */
export const workspaceNavigation = [
  { href: "/workspace/leads", label: "Заявки", tier: "primary" },
  { href: "/workspace/knowledge", label: "База знаний", tier: "primary" },
  { href: "/workspace/ai-runs", label: "AI runs", tier: "secondary" },
  { href: "/workspace/automations", label: "Автоматизации", tier: "secondary" },
] as const;

export function isPublicWorkspacePath(pathname: string) {
  return (
    pathname === "/workspace/leads" ||
    pathname === "/workspace/knowledge" ||
    pathname === "/workspace/ai-runs" ||
    pathname === "/workspace/automations" ||
    /^\/workspace\/leads\/[^/]+$/.test(pathname)
  );
}
