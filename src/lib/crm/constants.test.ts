import { describe, expect, it } from "vitest";

import { isPublicDemoPath, publicDemoNavigation } from "./constants";

describe("public demo CRM access", () => {
  it("exposes every employer-facing route without an auth-only branch", () => {
    expect(publicDemoNavigation.map((item) => item.href)).toEqual([
      "/demo/crm",
      "/demo/knowledge",
      "/demo/ai-runs",
      "/demo/automations",
    ]);

    expect(isPublicDemoPath("/demo/crm")).toBe(true);
    expect(
      isPublicDemoPath("/demo/leads/30000000-0000-4000-8000-000000000001"),
    ).toBe(true);
    expect(isPublicDemoPath("/account/login")).toBe(false);
  });
});
