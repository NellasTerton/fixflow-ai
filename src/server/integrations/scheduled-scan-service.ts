import type { ScheduledEventType } from "./contracts";

export const SCHEDULED_SCAN_DEFAULTS = {
  followUpAfterMinutes: 30,
  reminderWithinMinutes: 120,
  limit: 20,
} as const;

export interface FollowUpCandidate {
  leadId: string;
  publicNumber: string;
  category: string;
  serviceType: string;
  customerName: string;
  maskedPhone: string;
  addressSummary: string;
  createdAt: Date;
}

export interface ReminderCandidate {
  leadId: string;
  bookingId: string;
  publicNumber: string;
  category: string;
  serviceType: string;
  customerName: string;
  maskedPhone: string;
  addressSummary: string;
  startsAt: Date;
}

export interface PendingAutomationEvent {
  eventType: ScheduledEventType;
  entityType: "lead";
  entityId: string;
  payload: Record<string, unknown>;
}

export interface ScheduledScanStore {
  /**
   * Leads that are still waiting for a booking and already passed the
   * follow-up threshold. Seed rows are excluded by the implementation.
   */
  findLeadsWithoutBooking(
    createdBefore: Date,
    limit: number,
  ): Promise<FollowUpCandidate[]>;
  /** Upcoming bookings that start inside the reminder window. */
  findBookingsStartingSoon(
    now: Date,
    startsBefore: Date,
    limit: number,
  ): Promise<ReminderCandidate[]>;
  /**
   * Inserts the event once per (event type, entity). Returns the new event id
   * or `null` when the event already existed.
   */
  createEventIfMissing(
    event: PendingAutomationEvent,
    now: Date,
  ): Promise<string | null>;
}

export interface ScheduledScanDelivery {
  deliver(eventId: string): Promise<void>;
}

export interface ScheduledScanOptions {
  followUpAfterMinutes?: number;
  reminderWithinMinutes?: number;
  limit?: number;
}

export interface ScheduledScanSummary {
  followUpAfterMinutes: number;
  reminderWithinMinutes: number;
  followUpCandidates: number;
  followUpEventsCreated: number;
  reminderCandidates: number;
  reminderEventsCreated: number;
  createdEventIds: string[];
}

const MINUTE_MS = 60_000;

/**
 * Deterministic scan for delayed business automations. The schedule itself
 * lives in Make: this function only answers "which delayed events are due
 * right now?" and hands every new event to the existing outbox.
 */
export async function runScheduledScan(
  store: ScheduledScanStore,
  delivery: ScheduledScanDelivery,
  options: ScheduledScanOptions = {},
  now = new Date(),
): Promise<ScheduledScanSummary> {
  const followUpAfterMinutes =
    options.followUpAfterMinutes ?? SCHEDULED_SCAN_DEFAULTS.followUpAfterMinutes;
  const reminderWithinMinutes =
    options.reminderWithinMinutes ??
    SCHEDULED_SCAN_DEFAULTS.reminderWithinMinutes;
  const limit = options.limit ?? SCHEDULED_SCAN_DEFAULTS.limit;

  const followUpCutoff = new Date(now.getTime() - followUpAfterMinutes * MINUTE_MS);
  const reminderUntil = new Date(now.getTime() + reminderWithinMinutes * MINUTE_MS);

  const [followUpCandidates, reminderCandidates] = await Promise.all([
    store.findLeadsWithoutBooking(followUpCutoff, limit),
    store.findBookingsStartingSoon(now, reminderUntil, limit),
  ]);

  const createdEventIds: string[] = [];
  let followUpEventsCreated = 0;
  let reminderEventsCreated = 0;

  for (const candidate of followUpCandidates) {
    const eventId = await store.createEventIfMissing(
      buildFollowUpEvent(candidate, followUpAfterMinutes),
      now,
    );

    if (eventId) {
      followUpEventsCreated += 1;
      createdEventIds.push(eventId);
    }
  }

  for (const candidate of reminderCandidates) {
    const eventId = await store.createEventIfMissing(
      buildReminderEvent(candidate),
      now,
    );

    if (eventId) {
      reminderEventsCreated += 1;
      createdEventIds.push(eventId);
    }
  }

  for (const eventId of createdEventIds) {
    await delivery.deliver(eventId);
  }

  return {
    followUpAfterMinutes,
    reminderWithinMinutes,
    followUpCandidates: followUpCandidates.length,
    followUpEventsCreated,
    reminderCandidates: reminderCandidates.length,
    reminderEventsCreated,
    createdEventIds,
  };
}

export function buildFollowUpEvent(
  candidate: FollowUpCandidate,
  followUpAfterMinutes: number,
): PendingAutomationEvent {
  return {
    eventType: "lead.followup_due",
    entityType: "lead",
    entityId: candidate.leadId,
    payload: {
      leadId: candidate.leadId,
      publicNumber: candidate.publicNumber,
      category: candidate.category,
      serviceType: candidate.serviceType,
      customerName: candidate.customerName,
      maskedPhone: candidate.maskedPhone,
      addressSummary: candidate.addressSummary,
      leadCreatedAt: candidate.createdAt.toISOString(),
      waitingMinutes: followUpAfterMinutes,
      telegramMessage: [
        `⏰ Заявка ${candidate.publicNumber} осталась без бронирования`,
        `Категория: ${candidate.category}`,
        `Услуга: ${candidate.serviceType}`,
        `Клиент: ${candidate.customerName}`,
        `Телефон: ${candidate.maskedPhone}`,
        `Район: ${candidate.addressSummary}`,
        `Создана (UTC): ${formatUtc(candidate.createdAt)}`,
        `Прошло не меньше ${followUpAfterMinutes} мин. Нужно предложить время.`,
      ].join("\n"),
    },
  };
}

export function buildReminderEvent(
  candidate: ReminderCandidate,
): PendingAutomationEvent {
  return {
    eventType: "booking.reminder_due",
    entityType: "lead",
    entityId: candidate.leadId,
    payload: {
      leadId: candidate.leadId,
      bookingId: candidate.bookingId,
      publicNumber: candidate.publicNumber,
      category: candidate.category,
      serviceType: candidate.serviceType,
      customerName: candidate.customerName,
      maskedPhone: candidate.maskedPhone,
      addressSummary: candidate.addressSummary,
      startsAt: candidate.startsAt.toISOString(),
      telegramMessage: [
        `🔔 Скоро выезд по заявке ${candidate.publicNumber}`,
        `Категория: ${candidate.category}`,
        `Услуга: ${candidate.serviceType}`,
        `Клиент: ${candidate.customerName}`,
        `Телефон: ${candidate.maskedPhone}`,
        `Район: ${candidate.addressSummary}`,
        `Начало (UTC): ${formatUtc(candidate.startsAt)}`,
      ].join("\n"),
    },
  };
}

function formatUtc(value: Date) {
  return `${value.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
