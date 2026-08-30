import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";

import { googleAuthOptionsFromEnv, trustedOriginFromBaseURL, type FoundCalcGoogleAuthOptions } from "@/lib/auth/google-config";
import { authSchema } from "@/lib/persistence/schema";

export interface FoundCalcAuthOptions {
  readonly secret: string;
  readonly baseURL?: string;
  readonly adminUserIds?: readonly string[];
  readonly google?: FoundCalcGoogleAuthOptions;
}

type FoundCalcWorkerEnv = {
  readonly DB: D1Database;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly BETTER_AUTH_ADMIN_USER_IDS?: string;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
};

export const createFoundCalcAuth = (database: D1Database, options: FoundCalcAuthOptions) => {
  const db = drizzle(database, { schema: authSchema });
  const trustedOrigin = trustedOriginFromBaseURL(options.baseURL);
  return betterAuth({
    appName: "Found Calc",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    secret: options.secret,
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    ...(trustedOrigin ? { trustedOrigins: [trustedOrigin] } : {}),
    ...(options.google ? {
      socialProviders: {
        google: {
          clientId: options.google.clientId,
          clientSecret: options.google.clientSecret,
        },
      },
    } : {}),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    plugins: [admin({ adminUserIds: [...(options.adminUserIds ?? [])] })],
  });
};

export type FoundCalcAuth = ReturnType<typeof createFoundCalcAuth>;

export const parseAdminUserIds = (value: string | undefined): readonly string[] =>
  [...new Set((value ?? "").split(",").map((id) => id.trim()).filter(Boolean))];

export const getConfiguredAdminUserIds = (): readonly string[] => {
  const workerEnv = env as unknown as FoundCalcWorkerEnv;
  return parseAdminUserIds(workerEnv.BETTER_AUTH_ADMIN_USER_IDS);
};

let cachedAuth: FoundCalcAuth | undefined;

export const getFoundCalcAuth = (): FoundCalcAuth => {
  if (cachedAuth) return cachedAuth;
  const workerEnv = env as unknown as FoundCalcWorkerEnv;
  const secret = workerEnv.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be configured with at least 32 characters");
  }
  const google = googleAuthOptionsFromEnv(workerEnv.GOOGLE_CLIENT_ID, workerEnv.GOOGLE_CLIENT_SECRET);
  cachedAuth = createFoundCalcAuth(workerEnv.DB, {
    secret,
    ...(workerEnv.BETTER_AUTH_URL ? { baseURL: workerEnv.BETTER_AUTH_URL } : {}),
    adminUserIds: parseAdminUserIds(workerEnv.BETTER_AUTH_ADMIN_USER_IDS),
    ...(google ? { google } : {}),
  });
  return cachedAuth;
};