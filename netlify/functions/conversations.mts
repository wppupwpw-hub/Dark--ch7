import type { Config, Context } from "@netlify/functions";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { conversations, messages } from "../../db/schema.js";

export default async (req: Request, context: Context) => {
  const clientId = new URL(req.url).searchParams.get("clientId")?.trim();
  if (!clientId) return Response.json({ error: "Missing clientId" }, { status: 400 });

  const id = context.params.id ? Number(context.params.id) : null;
  if (context.params.id && !Number.isInteger(id)) {
    return Response.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  if (req.method === "GET" && id) {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.clientId, clientId)));
    if (!conv) return Response.json({ error: "Conversation not found" }, { status: 404 });

    const rows = await db
      .select({ role: messages.role, content: messages.content, model: messages.model })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.id));
    return Response.json({ conversation: conv, messages: rows });
  }

  if (req.method === "GET") {
    const rows = await db
      .select({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt })
      .from(conversations)
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(conversations.id));
    return Response.json({ conversations: rows });
  }

  if (req.method === "DELETE") {
    const where = id
      ? and(eq(conversations.id, id), eq(conversations.clientId, clientId))
      : eq(conversations.clientId, clientId);
    await db.delete(conversations).where(where);
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/conversations", "/api/conversations/:id"],
  method: ["GET", "DELETE"],
};
