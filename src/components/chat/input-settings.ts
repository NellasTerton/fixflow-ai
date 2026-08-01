import type { ChatField } from "@/lib/chat/contracts";

export interface ChatInputSettings {
  label: string;
  type: string;
  placeholder: string;
  maxLength: number | undefined;
  min: string | undefined;
  max: string | undefined;
}

/**
 * The input type the dispatcher expects for the field it is currently
 * collecting — a date picker for the visit date, a time picker for the
 * slot, plain text otherwise.
 */
export function inputSettings(field: ChatField): ChatInputSettings {
  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setUTCDate(maxDate.getUTCDate() + 14);

  const common = {
    min: undefined as string | undefined,
    max: undefined as string | undefined,
  };

  switch (field) {
    case "problemDescription":
      return {
        ...common,
        label: "Описание проблемы",
        type: "text",
        placeholder: "Например: стиральная машина не сливает воду",
        maxLength: 1000,
      };
    case "demoName":
      return {
        ...common,
        label: "Имя",
        type: "text",
        placeholder: "Как к вам обращаться",
        maxLength: 60,
      };
    case "phone":
      return {
        ...common,
        label: "Телефон",
        type: "tel",
        placeholder: "+380 00 000 1042",
        maxLength: 30,
      };
    case "area":
      return {
        ...common,
        label: "Район",
        type: "text",
        placeholder: "Например: Оболонский",
        maxLength: 120,
      };
    case "preferredDate":
      return {
        label: "Желательная дата",
        type: "date",
        placeholder: "",
        min: now.toISOString().slice(0, 10),
        max: maxDate.toISOString().slice(0, 10),
        maxLength: undefined,
      };
    case "preferredTime":
      return {
        ...common,
        label: "Желательное время",
        type: "time",
        placeholder: "",
        maxLength: undefined,
      };
    default:
      return {
        ...common,
        label: "Ответ",
        type: "text",
        placeholder: "Введите ответ",
        maxLength: 1000,
      };
  }
}
