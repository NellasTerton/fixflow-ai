export const serviceCategories = [
  {
    id: "appliance",
    title: "Бытовая техника",
    description: "Диагностика и ремонт техники на дому.",
  },
  {
    id: "plumbing",
    title: "Сантехника",
    description: "Устранение протечек, засоров и неисправностей.",
  },
  {
    id: "climate",
    title: "Кондиционеры",
    description: "Установка, диагностика и сезонное обслуживание.",
  },
] as const;

export const workflowStages = [
  "Клиентский чат",
  "Категория и RAG",
  "Контакты",
  "Выбор времени",
  "Создание заявки",
  "Публичная CRM",
  "Webhook",
  "Telegram и follow-up",
] as const;

export function maskDemoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 4) {
    return "••••";
  }

  return `+${digits.slice(0, 2)} ••• ••• ${digits.slice(-2)}`;
}
