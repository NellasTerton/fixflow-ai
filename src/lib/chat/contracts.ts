import { z } from "zod";

export interface ChatResponse {
  conversationId: string;
  reply: string;
  leadId?: string;
  publicNumber?: string;
  bookingId?: string;
}

export const chatStartRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Опишите проблему")
    .max(1000, "Сообщение должно быть не длиннее 1000 символов"),
});

export const chatMessageRequestSchema = z.object({
  conversationId: z.uuid("Некорректный идентификатор диалога"),
  message: z
    .string()
    .trim()
    .min(1, "Введите ответ")
    .max(1000, "Сообщение должно быть не длиннее 1000 символов"),
});
