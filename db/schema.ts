import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Each browser gets an anonymous client ID so visitors only see their own chats.
export const conversations = pgTable(
  "conversations",
  {
    id: serial().primaryKey(),
    clientId: text("client_id").notNull(),
    title: text().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("conversations_client_id_idx").on(t.clientId)],
);

export const messages = pgTable(
  "messages",
  {
    id: serial().primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text().notNull(), // "user" | "assistant"
    content: text().notNull(),
    model: text(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("messages_conversation_id_idx").on(t.conversationId)],
);
