import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a request header against a configured secret.
 * Hashing first keeps the comparison length-independent.
 */
export function matchesAutomationSecret(
  candidate: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!candidate || !expected) {
    return false;
  }

  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(candidateHash, expectedHash);
}
