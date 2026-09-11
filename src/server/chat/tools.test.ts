import { describe, expect, it } from "vitest";

import { matchServiceByName } from "./service-matching";

/**
 * The deterministic part of tool handling that doesn't need Postgres — the
 * substring match decides whether an LLM-proposed service name resolves to
 * exactly one real catalog row. `create_lead`'s DB writes (customer upsert,
 * atomic lead insert, duplicate-lead guard) and `book_slot`'s atomic
 * conditional claim are exercised by the scripted end-to-end runs against
 * the real dev database instead (see docs/progress.md) — the old
 * in-memory-store unit tests relied on `workflow.ts`'s injectable
 * `ChatWorkflowStore` interface, which this rewrite intentionally drops in
 * favor of calling Drizzle directly, the same way `tools.ts`'s model
 * (fitness-agent's `booking.ts`) does.
 */
describe("matchServiceByName", () => {
  const services = [
    { id: "1", name: "Замена смесителя" },
    { id: "2", name: "Устранение протечки" },
    { id: "3", name: "Прочистка засора" },
    { id: "4", name: "Выезд и диагностика" },
  ];

  it("resolves an exact name", () => {
    expect(matchServiceByName(services, "Замена смесителя")?.id).toBe("1");
  });

  it("resolves a name embedded in a longer phrase", () => {
    expect(
      matchServiceByName(services, "нужна замена смесителя на кухне")?.id,
    ).toBe("1");
  });

  it("resolves the other direction — a short candidate contained in the request", () => {
    expect(matchServiceByName(services, "прочистка засора в ванной")?.id).toBe(
      "3",
    );
  });

  it("returns null for text too short to be meaningful", () => {
    expect(matchServiceByName(services, "да")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(matchServiceByName(services, "покрасить забор")).toBeNull();
  });

  it("returns null on an ambiguous match against multiple rows", () => {
    const ambiguous = [
      { id: "1", name: "Ремонт" },
      { id: "2", name: "Ремонт техники" },
    ];
    expect(matchServiceByName(ambiguous, "ремонт")).toBeNull();
  });
});
