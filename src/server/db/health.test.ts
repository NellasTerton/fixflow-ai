import { describe, expect, it, vi } from "vitest";

import { checkDatabaseConnection } from "./health";

describe("checkDatabaseConnection", () => {
  it("executes a probe query and reports a connected mock database", async () => {
    const execute = vi.fn().mockResolvedValue([{ "?column?": 1 }]);

    const result = await checkDatabaseConnection({ execute });

    expect(execute).toHaveBeenCalledOnce();
    expect(result).toEqual({
      status: "ok",
      database: "connected",
    });
  });

  it("propagates a mock database error", async () => {
    const error = new Error("database unavailable");
    const execute = vi.fn().mockRejectedValue(error);

    await expect(checkDatabaseConnection({ execute })).rejects.toBe(error);
  });
});
