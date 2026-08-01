import type {
  CrmCategory,
  CrmLeadStatus,
  CrmPriority,
  CrmSource,
} from "./constants";

export interface PublicLead {
  id: string;
  publicNumber: string;
  customerName: string;
  maskedPhone: string;
  addressSummary: string;
  category: CrmCategory;
  serviceType: string;
  problemDescription: string;
  status: CrmLeadStatus;
  priority: CrmPriority;
  /** AI escalated this request: a dispatcher needs to pick it up manually. */
  needsOperator: boolean;
  source: CrmSource;
  preferredDate: string | null;
  preferredTime: string | null;
  bookingStartsAt: string | null;
  bookingEndsAt: string | null;
  estimatedPriceFrom: number | null;
  estimatedPriceTo: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMessage {
  id: string;
  sender: "customer" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface PublicAiRun {
  id: string;
  leadPublicNumber: string | null;
  operation: string;
  model: string;
  inputSummary: string;
  question: string | null;
  reply: string | null;
  action: string | null;
  retrievedChunks: Array<{
    title: string;
    source: string;
    content: string;
    similarity: number;
  }>;
  durationMs: number;
  status: "success" | "error";
  error: string | null;
  createdAt: string;
}

export interface PublicIntegrationEvent {
  id: string;
  eventType: string;
  deliveryStatus: "pending" | "delivered" | "failed";
  httpStatus: number | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface PublicAutomationLog {
  id: string;
  eventType: string | null;
  platform: string;
  workflowName: string;
  action: string;
  status: "started" | "success" | "failed";
  externalRunId: string | null;
  details: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface PublicLeadDetail extends PublicLead {
  messages: PublicMessage[];
  aiRuns: PublicAiRun[];
  integrationEvents: PublicIntegrationEvent[];
  automationLogs: PublicAutomationLog[];
}

export interface PublicDocument {
  id: string;
  title: string;
  category: CrmCategory;
  contentPreview: string;
  status: "draft" | "published" | "archived";
  updatedAt: string;
}

export interface PublicCrmFilters {
  category?: CrmCategory;
  status?: CrmLeadStatus;
  priority?: CrmPriority;
  source?: CrmSource;
  search?: string;
}
