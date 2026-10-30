CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY,
	"client_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "conversations_client_id_idx" ON "conversations" ("client_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" ("conversation_id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;