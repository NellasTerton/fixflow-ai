import { describe, expect, it } from "vitest";

import { maskDemoPhone, serviceCategories, workflowStages } from "./demo";

describe("FixFlow demo model", () => {
  it("contains the three supported service categories", () => {
    expect(serviceCategories.map((service) => service.id)).toEqual([
      "appliance",
      "plumbing",
      "climate",
    ]);
  });

  it("describes the complete demo workflow", () => {
    expect(workflowStages).toHaveLength(8);
    expect(workflowStages.at(-1)).toBe("Telegram и follow-up");
  });

  it("does not expose a full demo phone number", () => {
    const masked = maskDemoPhone("+380 67 123 45 67");

    expect(masked).toBe("+38 ••• ••• 67");
    expect(masked).not.toContain("123");
  });
});
