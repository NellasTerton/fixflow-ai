import { describe, expect, it } from "vitest";

import {
  runScheduledScan,
  SCHEDULED_SCAN_DEFAULTS,
  type FollowUpCandidate,
  type PendingAutomationEvent,
  type ReminderCandidate,
  type ScheduledScanStore,
} from "./scheduled-scan-service";

const NOW = new Date("2026-07-31T12:00:00.000Z");

const followUpCandidate: FollowUpCandidate = {
  leadId: "10000000-0000-4000-8000-000000000001",
  publicNumber: "FF-1047",
  category: "plumbing",
  serviceType: "Устранение протечки",
  customerName: "Ирина Д.",
  maskedPhone: "+7 •• ••• 0042",
  addressSummary: "Тверской район · точный адрес скрыт",
  createdAt: new Date("2026-07-31T11:00:00.000Z"),
};

const reminderCandidate: ReminderCandidate = {
  leadId: "10000000-0000-4000-8000-000000000002",
  bookingId: "20000000-0000-4000-8000-000000000002",
  publicNumber: "FF-1048",
  category: "air_conditioning",
  serviceType: "Установка кондиционера",
  customerName: "Павел К.",
  maskedPhone: "+7 •• ••• 0043",
  addressSummary: "Тверской район · точный адрес скрыт",
  startsAt: new Date("2026-07-31T13:30:00.000Z"),
};

class MemoryScheduledScanStore implements ScheduledScanStore {
  readonly created: PendingAutomationEvent[] = [];
  readonly followUpCalls: Array<{ createdBefore: Date; limit: number }> = [];
  readonly reminderCalls: Array<{
    now: Date;
    startsBefore: Date;
    limit: number;
  }> = [];

  private counter = 0;

  constructor(
    private readonly followUps: FollowUpCandidate[] = [],
    private readonly reminders: ReminderCandidate[] = [],
    private readonly existingKeys = new Set<string>(),
  ) {}

  async findLeadsWithoutBooking(createdBefore: Date, limit: number) {
    this.followUpCalls.push({ createdBefore, limit });
    return this.followUps;
  }

  async findBookingsStartingSoon(now: Date, startsBefore: Date, limit: number) {
    this.reminderCalls.push({ now, startsBefore, limit });
    return this.reminders;
  }

  async createEventIfMissing(event: PendingAutomationEvent) {
    const key = `${event.eventType}|${event.entityType}|${event.entityId}`;

    if (this.existingKeys.has(key)) {
      return null;
    }

    this.existingKeys.add(key);
    this.created.push(event);
    this.counter += 1;

    return `event-${this.counter}`;
  }
}

class RecordingDelivery {
  readonly delivered: string[] = [];

  async deliver(eventId: string) {
    this.delivered.push(eventId);
  }
}

describe("scheduled automation scan", () => {
  it("creates and delivers one event per due lead and booking", async () => {
    const store = new MemoryScheduledScanStore(
      [followUpCandidate],
      [reminderCandidate],
    );
    const delivery = new RecordingDelivery();

    const summary = await runScheduledScan(store, delivery, {}, NOW);

    expect(summary.followUpEventsCreated).toBe(1);
    expect(summary.reminderEventsCreated).toBe(1);
    expect(delivery.delivered).toEqual(["event-1", "event-2"]);
    expect(store.created.map((event) => event.eventType)).toEqual([
      "lead.followup_due",
      "booking.reminder_due",
    ]);
    expect(store.created.every((event) => event.entityType === "lead")).toBe(
      true,
    );
  });

  it("derives the follow-up cutoff and reminder window from the options", async () => {
    const store = new MemoryScheduledScanStore();

    await runScheduledScan(
      store,
      new RecordingDelivery(),
      { followUpAfterMinutes: 45, reminderWithinMinutes: 90, limit: 7 },
      NOW,
    );

    expect(store.followUpCalls[0]).toEqual({
      createdBefore: new Date("2026-07-31T11:15:00.000Z"),
      limit: 7,
    });
    expect(store.reminderCalls[0]).toEqual({
      now: NOW,
      startsBefore: new Date("2026-07-31T13:30:00.000Z"),
      limit: 7,
    });
  });

  it("falls back to the documented defaults", async () => {
    const store = new MemoryScheduledScanStore();

    const summary = await runScheduledScan(
      store,
      new RecordingDelivery(),
      {},
      NOW,
    );

    expect(summary.followUpAfterMinutes).toBe(
      SCHEDULED_SCAN_DEFAULTS.followUpAfterMinutes,
    );
    expect(summary.reminderWithinMinutes).toBe(
      SCHEDULED_SCAN_DEFAULTS.reminderWithinMinutes,
    );
    expect(store.followUpCalls[0]?.limit).toBe(SCHEDULED_SCAN_DEFAULTS.limit);
  });

  it("never repeats a delayed event for the same entity", async () => {
    const existing = new Set([
      `lead.followup_due|lead|${followUpCandidate.leadId}`,
      `booking.reminder_due|lead|${reminderCandidate.leadId}`,
    ]);
    const store = new MemoryScheduledScanStore(
      [followUpCandidate],
      [reminderCandidate],
      existing,
    );
    const delivery = new RecordingDelivery();

    const summary = await runScheduledScan(store, delivery, {}, NOW);

    expect(summary.followUpCandidates).toBe(1);
    expect(summary.reminderCandidates).toBe(1);
    expect(summary.followUpEventsCreated).toBe(0);
    expect(summary.reminderEventsCreated).toBe(0);
    expect(delivery.delivered).toEqual([]);
  });

  it("builds Telegram messages without raw personal data", async () => {
    const store = new MemoryScheduledScanStore(
      [followUpCandidate],
      [reminderCandidate],
    );

    await runScheduledScan(store, new RecordingDelivery(), {}, NOW);

    const [followUp, reminder] = store.created;
    const followUpMessage = String(followUp?.payload.telegramMessage);
    const reminderMessage = String(reminder?.payload.telegramMessage);

    expect(followUpMessage).toContain("FF-1047");
    expect(followUpMessage).toContain("2026-07-31 11:00 UTC");
    expect(followUpMessage).toContain("+7 •• ••• 0042");
    expect(reminderMessage).toContain("FF-1048");
    expect(reminderMessage).toContain("2026-07-31 13:30 UTC");

    for (const message of [followUpMessage, reminderMessage]) {
      expect(message).not.toMatch(/\+7000\d/);
      expect(message).not.toContain("улица");
    }
  });
});
