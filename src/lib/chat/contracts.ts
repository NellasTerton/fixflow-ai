import { z } from "zod";

import { crmCategories, type CrmCategory } from "../crm/constants";

export const chatActions = [
  "ask_question",
  "show_categories",
  "show_services",
  "show_slots",
  "create_lead",
  "create_booking",
  "handoff_to_human",
  "complete",
] as const;

export const chatFields = [
  "problemDescription",
  "category",
  "serviceType",
  "demoName",
  "phone",
  "area",
  "preferredDate",
  "preferredTime",
] as const;

export const chatSteps = [
  "category",
  "service",
  "name",
  "phone",
  "area",
  "fulfillment",
  "preferred_date",
  "preferred_time",
  "slot",
  "complete",
] as const;

export type ChatAction = (typeof chatActions)[number];
export type ChatField = (typeof chatFields)[number];
export type ChatStep = (typeof chatSteps)[number];

export interface ChatOption {
  value: string;
  label: string;
  description?: string;
}

export interface ChatSource {
  title: string;
  source: string;
  category: CrmCategory;
  excerpt: string;
  similarity: number;
}

export interface ChatCollectedData {
  problemDescription?: string;
  category?: CrmCategory;
  serviceId?: string;
  serviceType?: string;
  demoName?: string;
  phone?: string;
  area?: string;
  fulfillmentChoice?: "self_service" | "callback";
  preferredDate?: string;
  preferredTime?: string;
  leadId?: string;
  publicNumber?: string;
  slotId?: string;
  bookingId?: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  action: ChatAction;
  missingFields: ChatField[];
  collectedData: ChatCollectedData;
  options: ChatOption[];
  sources?: ChatSource[];
}

export const chatStartRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Опишите проблему хотя бы в 10 символах")
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

export const storedChatDataSchema = z.object({
  problemDescription: z.string().max(1000).optional(),
  category: z.enum(crmCategories).optional(),
  serviceId: z.uuid().optional(),
  serviceType: z.string().max(160).optional(),
  demoName: z.string().max(60).optional(),
  phone: z.string().max(20).optional(),
  area: z.string().max(120).optional(),
  fulfillmentChoice: z.enum(["self_service", "callback"]).optional(),
  preferredDate: z.string().date().optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  leadId: z.uuid().optional(),
  publicNumber: z.string().max(32).optional(),
  slotId: z.uuid().optional(),
  bookingId: z.uuid().optional(),
});
