import type { Config } from "@netlify/functions";
import { DEFAULT_MODEL, MODELS } from "../../lib/ai.js";

export default async () => {
  const models = Object.entries(MODELS).map(([id, m]) => ({ id, label: m.label }));
  return Response.json({ models, default: DEFAULT_MODEL });
};

export const config: Config = {
  path: "/api/models",
  method: "GET",
};
