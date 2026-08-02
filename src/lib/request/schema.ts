import { z } from "zod";

import { crmCategories } from "../crm/constants";

// A well-formed Russian number after normalisation: +7 followed by ten
// digits. We normalise a leading 8 and bare ten-digit locals to this shape.
export const RUSSIAN_PHONE_PATTERN = /^\+7\d{10}$/;
const EXACT_ADDRESS_PATTERN =
  /(?:(?:кв(?:артира)?|дом|будинок)|\b\d{1,4}[/-]\d{1,4}\b)/iu;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  // 8 (985) 123-45-67 — the domestic trunk prefix maps to +7.
  if (digits.length === 11 && digits.startsWith("8")) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.startsWith("7")) {
    return `+${digits}`;
  }

  // A bare ten-digit local number is assumed to be Russian.
  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return `+${digits}`;
}

export function createPublicRequestSchema(now = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const lastAllowedDate = new Date(today);
  lastAllowedDate.setUTCDate(lastAllowedDate.getUTCDate() + 14);

  return z.object({
    demoName: z
      .string()
      .trim()
      .min(2, "Укажите имя")
      .max(60, "Имя должно быть не длиннее 60 символов"),
    phone: z
      .string()
      .trim()
      .max(30, "Телефон слишком длинный")
      .transform(normalizePhone)
      .refine(
        (value) => RUSSIAN_PHONE_PATTERN.test(value),
        "Укажите номер телефона в формате +7 985 123 45 67",
      ),
    category: z.enum(crmCategories, {
      error: "Выберите категорию",
    }),
    serviceId: z.uuid("Выберите тип услуги"),
    problemDescription: z
      .string()
      .trim()
      .min(10, "Опишите проблему хотя бы в 10 символах")
      .max(1000, "Описание должно быть не длиннее 1000 символов"),
    area: z
      .string()
      .trim()
      .min(2, "Укажите район или общий адрес")
      .max(120, "Адрес должен быть не длиннее 120 символов")
      .refine(
        (value) => !EXACT_ADDRESS_PATTERN.test(value),
        "Не указывайте номер дома или квартиры — достаточно района",
      ),
    preferredDate: z
      .string()
      .date("Укажите корректную дату")
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return date >= today && date <= lastAllowedDate;
      }, "Выберите дату в пределах следующих 14 дней"),
    idempotencyKey: z.uuid("Обновите страницу и попробуйте ещё раз"),
    company: z.string().max(0).optional().default(""),
  });
}

export const bookingRequestSchema = z.object({
  leadId: z.uuid(),
  slotId: z.uuid("Выберите свободное время"),
});

export type PublicRequestInput = z.infer<
  ReturnType<typeof createPublicRequestSchema>
>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
