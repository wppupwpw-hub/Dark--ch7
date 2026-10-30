import type { Config } from "@netlify/functions";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { conversations, messages } from "../../db/schema.js";
import { complete, DEFAULT_MODEL, MODELS, type ChatMessage } from "../../lib/ai.js";

const MAX_MESSAGE_LENGTH = 20000;

export default async (req: Request) => {
  let body: { clientId?: string; conversationId?: number | null; model?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  const text = body.message?.trim();
  const modelKey = body.model && MODELS[body.model] ? body.model : DEFAULT_MODEL;

  if (!clientId) return Response.json({ error: "Missing clientId" }, { status: 400 });
  if (!text) return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  if (text.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` }, { status: 400 });
  }

  let conversationId = body.conversationId ?? null;
  let history: ChatMessage[] = [];

  if (conversationId) {
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.clientId, clientId)));
    if (!conv) return Response.json({ error: "Conversation not found" }, { status: 404 });

    const rows = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.id));
    history = rows.map((r) => ({ role: r.role as ChatMessage["role"], content: r.content }));
  }

  history.push({ role: "user", content: text });

  let reply: string;
  try {
    reply = await complete(modelKey, history);
  } catch (err) {
    console.error("AI request failed", err);
    return Response.json({ error: "The AI model could not answer right now. Please try again." }, { status: 502 });
  }

  if (!conversationId) {
    const title = text.split(/\s+/).slice(0, 6).join(" ").slice(0, 80);
    const [conv] = await db.insert(conversations).values({ clientId, title }).returning({ id: conversations.id });
    conversationId = conv.id;
  }

  await db.insert(messages).values([
    { conversationId, role: "user", content: text },
    { conversationId, role: "assistant", content: reply, model: modelKey },
  ]);

  return Response.json({ conversationId, reply, model: modelKey });
};

export const config: Config = {
  path: "/api/chat",
  method: "POST",
};
