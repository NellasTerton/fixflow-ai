import { describe, expect, it } from "vitest";

import { isPublicWorkspacePath, workspaceNavigation } from "./constants";

describe("public workspace access", () => {
  it("exposes every employer-facing route without an auth-only branch", () => {
    expect(workspaceNavigation.map((item) => item.href)).toEqual([
      "/workspace/leads",
      "/workspace/knowledge",
    ]);

    expect(isPublicWorkspacePath("/workspace/leads")).toBe(true);
    expect(
      isPublicWorkspacePath(
        "/workspace/leads/30000000-0000-4000-8000-000000000001",
      ),
    ).toBe(true);
    expect(isPublicWorkspacePath("/account/login")).toBe(false);
  });

  it("keeps technical trace pages reachable but out of the main nav", () => {
    const navHrefs = workspaceNavigation.map((item) => item.href);

    expect(navHrefs).not.toContain("/workspace/ai-runs");
    expect(navHrefs).not.toContain("/workspace/automations");

    // Still routable — they are linked from an individual lead instead.
    expect(isPublicWorkspacePath("/workspace/ai-runs")).toBe(true);
    expect(isPublicWorkspacePath("/workspace/automations")).toBe(true);
  });
});
