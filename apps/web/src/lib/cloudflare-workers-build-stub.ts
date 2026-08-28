import type { D1Database } from "@cloudflare/workers-types";

const unavailable = () => {
  throw new Error("Cloudflare bindings are unavailable in the canonical Node build stub");
};

export const env = {
  DB: new Proxy({}, { get: () => unavailable }) as D1Database,
  BETTER_AUTH_SECRET: "build-only-placeholder-secret-32chars",
  BETTER_AUTH_URL: "http://127.0.0.1:3000",
};
