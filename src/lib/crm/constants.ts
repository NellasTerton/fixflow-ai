export const crmCategories = [
  "appliance_repair",
  "plumbing",
  "air_conditioning",
  "common",
] as const;

export const crmLeadStatuses = [
  "new",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
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
  booked: "Запланированы",
  in_progress: "В работе",
  completed: "Выполнены",
  cancelled: "Отменены",
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
 * Only the surfaces a dispatcher actually works in. The AI-trace and
 * automation-log pages still exist and stay linked from a lead's own card,
 * where that detail is relevant — they are not top-level destinations.
 */
export const workspaceNavigation = [
  { href: "/workspace/leads", label: "Заявки" },
  { href: "/workspace/knowledge", label: "База знаний" },
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
