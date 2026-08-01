import { describe, expect, it } from "vitest";

import {
  createAddressSummary,
  maskPhone,
  redactPublicText,
  stripDemoTag,
} from "./presentation";

describe("public CRM data masking", () => {
  it("keeps only a safe phone suffix", () => {
    const source = "+380 00 000 0042";
    const masked = maskPhone(source);

    expect(masked).toBe("+380 •• ••• 0042");
    expect(masked).not.toContain("000 0042");
    expect(masked).not.toBe(source);
  });

  it("never returns the exact customer address", () => {
    const source = "[ДЕМО] Демо-город, улица Вымышленная, дом DEMO-42";
    const summary = createAddressSummary(source);

    expect(summary).toBe("Демо-город · точный адрес скрыт");
    expect(summary).not.toContain("Вымышленная");
    expect(summary).not.toContain("DEMO-42");
  });

  it("redacts contacts embedded in message history", () => {
    const result = redactPublicText(
      "Позвоните +380 00 000 0042, улица Тестовая, дом 42.",
    );

    expect(result).not.toContain("+380 00 000 0042");
    expect(result).not.toContain("Тестовая");
    expect(result).toContain("[телефон скрыт]");
    expect(result).toContain("[точный адрес скрыт]");
  });

  it("strips the demo safety tag for on-screen display only", () => {
    expect(stripDemoTag("[ДЕМО] Иван Петров")).toBe("Иван Петров");
    expect(stripDemoTag("Иван Петров")).toBe("Иван Петров");
  });
});
