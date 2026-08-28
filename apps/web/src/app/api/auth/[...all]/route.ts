import { toNextJsHandler } from "better-auth/next-js";

import { getFoundCalcAuth } from "@/lib/auth/server";

const handlerFor = (method: "GET" | "POST") => async (request: Request) => {
  const handlers = toNextJsHandler(getFoundCalcAuth());
  return handlers[method](request);
};

export const GET = handlerFor("GET");
export const POST = handlerFor("POST");
