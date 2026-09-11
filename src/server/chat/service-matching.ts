/**
 * Deterministic free-text service match — the LLM proposes a service name,
 * this decides whether it resolves to one real catalog row. Substring match
 * either direction, only accepted when it's unambiguous. Pure (no DB, no
 * "server-only") so it's unit-testable directly — see tools.test.ts.
 */
export function matchServiceByName<T extends { name: string }>(
  services: T[],
  requestedName: string,
): T | null {
  const requested = normalizeText(requestedName);

  if (requested.length <= 2) {
    return null;
  }

  const matches = services.filter((service) => {
    const candidate = normalizeText(service.name);
    return candidate.includes(requested) || requested.includes(candidate);
  });

  return matches.length === 1 ? matches[0]! : null;
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU").replace(/\s+/gu, " ");
}
