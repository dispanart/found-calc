import type { NormalizedWidgetOrigin } from "./contracts";

export const WIDGET_VERIFICATION_TTL_MS = 72 * 60 * 60 * 1000;
export const WIDGET_VERIFICATION_CHECK_INTERVAL_MS = 30 * 1000;
export const WIDGET_VERIFICATION_PREFIX = "foundcalc-site-verification=";

export type ResolveTxt = (hostname: string) => Promise<readonly (readonly string[])[]>;

export interface VerifyDnsTxtChallengeInput {
  readonly hostname: string;
  readonly challengeToken: string;
  readonly resolveTxt: ResolveTxt;
}

export type VerifyDnsTxtChallengeResult =
  | { readonly ok: true; readonly verified: true }
  | { readonly ok: true; readonly verified: false; readonly code: "record-not-found" | "token-not-found" }
  | { readonly ok: false; readonly code: "resolver-unavailable" };

export const createVerificationExpiry = (createdAt: number): number =>
  createdAt + WIDGET_VERIFICATION_TTL_MS;

export const isVerificationExpired = (expiresAt: number, now: number): boolean => now >= expiresAt;

export const isVerificationCheckAllowed = (lastCheckedAt: number | null, now: number): boolean =>
  lastCheckedAt === null || now - lastCheckedAt >= WIDGET_VERIFICATION_CHECK_INTERVAL_MS;

export const verifyDnsTxtChallenge = async (
  input: VerifyDnsTxtChallengeInput,
): Promise<VerifyDnsTxtChallengeResult> => {
  const recordName = `_foundcalc-verification.${input.hostname}`;
  let records: readonly (readonly string[])[];
  try {
    records = await input.resolveTxt(recordName);
  } catch {
    return { ok: false, code: "resolver-unavailable" };
  }
  if (records.length === 0) return { ok: true, verified: false, code: "record-not-found" };
  const expected = `${WIDGET_VERIFICATION_PREFIX}${input.challengeToken}`;
  const found = records.some((fragments) => fragments.join("") === expected);
  return found
    ? { ok: true, verified: true }
    : { ok: true, verified: false, code: "token-not-found" };
};

export const verifyLocalDevelopmentOrigin = (
  origin: NormalizedWidgetOrigin,
): { readonly ok: true; readonly verified: true } | { readonly ok: false; readonly code: "local-origin-required" } =>
  origin.isLocalDevelopment
    ? { ok: true, verified: true }
    : { ok: false, code: "local-origin-required" };
