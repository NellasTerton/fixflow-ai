import { describe, expect, it } from "vitest";

import { createPublicRequestSchema, normalizePhone } from "./schema";

const now = new Date("2026-07-30T12:00:00.000Z");

const validRequest = {
  demoName: "Тестовый Клиент",
  phone: "+7 (000) 000-1042",
  category: "plumbing",
  serviceId: "10000000-0000-4000-8000-000000000005",
  problemDescription: "Протечка под мойкой в тестовой заявке.",
  area: "Тверской район",
  preferredDate: "2026-08-02",
  idempotencyKey: "60000000-0000-4000-8000-000000000001",
  company: "",
};

describe("public request validation", () => {
  it("normalizes and accepts only a safe demo phone", () => {
    expect(normalizePhone("+7 (000) 000-1042")).toBe("+70000001042");

    const result = createPublicRequestSchema(now).parse(validRequest);

    expect(result.phone).toBe("+70000001042");
  });

  it("rejects real-looking phones and exact apartment addresses", () => {
    const result = createPublicRequestSchema(now).safeParse({
      ...validRequest,
      phone: "+7 916 123 45 67",
      area: "улица Тестовая, дом 42, квартира 7",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.phone).toBeDefined();
    expect(result.error?.flatten().fieldErrors.area).toBeDefined();
  });

  it("enforces field lengths and the 14-day date window", () => {
    const result = createPublicRequestSchema(now).safeParse({
      ...validRequest,
      problemDescription: "x".repeat(1001),
      preferredDate: "2026-08-20",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.flatten().fieldErrors.problemDescription,
    ).toBeDefined();
    expect(result.error?.flatten().fieldErrors.preferredDate).toBeDefined();
  });
});
