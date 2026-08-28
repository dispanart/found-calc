import type { D1Database } from "@cloudflare/workers-types";

import type { FoundCalcAuth } from "@/lib/auth/server";
import { createCalculatorStateRepository, type CalculatorStateOwnerType } from "./repository";
import {
  isSupportedCalculatorId,
  MAX_PERSISTED_STATE_BYTES,
  parsePersistedCalculatorState,
} from "./state";

export const GUEST_COOKIE_NAME = "found_calc_guest";
const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Services {
  readonly DB: D1Database;
  readonly auth: FoundCalcAuth;
}

interface RequestOwner {
  readonly ownerType: CalculatorStateOwnerType;
  readonly ownerId: string;
}

const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...Object.fromEntries(new Headers(extraHeaders).entries()) },
  });

const error = (code: string, status: number) => json({ error: { code } }, status);

const cookieValue = (header: string | null, name: string): string | undefined => {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
};

export const getGuestId = (request: Request): string | undefined => {
  const value = cookieValue(request.headers.get("cookie"), GUEST_COOKIE_NAME);
  return value && UUID.test(value) ? value : undefined;
};

const secureAttribute = (request: Request) => new URL(request.url).protocol === "https:" ? "; Secure" : "";

export const guestCookieHeader = (request: Request, guestId: string) =>
  `${GUEST_COOKIE_NAME}=${guestId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GUEST_MAX_AGE_SECONDS}${secureAttribute(request)}`;

export const clearGuestCookieHeader = (request: Request) =>
  `${GUEST_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureAttribute(request)}`;

const authenticatedUserId = async (request: Request, auth: FoundCalcAuth): Promise<string | undefined> => {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
};

const resolveOwner = async (request: Request, auth: FoundCalcAuth): Promise<RequestOwner | undefined> => {
  const userId = await authenticatedUserId(request, auth);
  if (userId) return { ownerType: "user", ownerId: userId };
  const guestId = getGuestId(request);
  return guestId ? { ownerType: "guest", ownerId: guestId } : undefined;
};

const stateResponse = (state: Awaited<ReturnType<ReturnType<typeof createCalculatorStateRepository>["getState"]>>) =>
  state ? { calculatorId: state.calculatorId, state: state.state, updatedAt: state.updatedAt } : null;

export const handleCalculatorStateRequest = async (
  method: "GET" | "PUT" | "DELETE",
  request: Request,
  calculatorId: string,
  services: Services,
): Promise<Response> => {
  if (!isSupportedCalculatorId(calculatorId)) return error("unsupported-calculator", 404);
  const repo = createCalculatorStateRepository(services.DB);

  try {
    if (method === "GET") {
      const owner = await resolveOwner(request, services.auth);
      if (!owner) return error("state-not-found", 404);
      const found = await repo.getState(owner.ownerType, owner.ownerId, calculatorId);
      return found ? json(stateResponse(found)) : error("state-not-found", 404);
    }

    if (method === "DELETE") {
      const owner = await resolveOwner(request, services.auth);
      if (!owner) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      await repo.deleteState(owner.ownerType, owner.ownerId, calculatorId);
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PERSISTED_STATE_BYTES) {
      return error("payload-too-large", 413);
    }
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_PERSISTED_STATE_BYTES) {
      return error("payload-too-large", 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return error("invalid-json", 400);
    }
    const parsed = parsePersistedCalculatorState(body);
    if (!parsed.ok) return error(parsed.code, parsed.code === "payload-too-large" ? 413 : 400);
    if (parsed.value.calculatorId !== calculatorId) return error("calculator-mismatch", 400);

    const userId = await authenticatedUserId(request, services.auth);
    const existingGuestId = getGuestId(request);
    const mintedGuestId = userId ? undefined : existingGuestId ?? crypto.randomUUID();
    const owner: RequestOwner = userId
      ? { ownerType: "user", ownerId: userId }
      : { ownerType: "guest", ownerId: mintedGuestId! };
    const stored = await repo.upsertState({ ownerType: owner.ownerType, ownerId: owner.ownerId, state: parsed.value });
    const headers = mintedGuestId && !existingGuestId ? { "Set-Cookie": guestCookieHeader(request, mintedGuestId) } : undefined;
    return json(stateResponse(stored), 200, headers);
  } catch {
    return error("storage-unavailable", 503);
  }
};

export const handleGuestClaimRequest = async (request: Request, services: Services): Promise<Response> => {
  try {
    const userId = await authenticatedUserId(request, services.auth);
    if (!userId) return error("authentication-required", 401);
    const guestId = getGuestId(request);
    if (!guestId) return json({ claimed: 0, keptUser: 0 });
    const result = await createCalculatorStateRepository(services.DB).claimGuestStates(guestId, userId);
    return json(result, 200, { "Set-Cookie": clearGuestCookieHeader(request) });
  } catch {
    return error("storage-unavailable", 503);
  }
};
