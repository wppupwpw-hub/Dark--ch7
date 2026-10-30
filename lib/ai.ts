import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Provider = "openai" | "anthropic" | "gemini";

// Models offered in the UI. Keys are what the browser sends; values are AI Gateway model IDs.
export const MODELS: Record<string, { label: string; provider: Provider; model: string }> = {
  "gpt-5.4-mini": { label: "GPT-5.4 mini", provider: "openai", model: "gpt-5.4-mini" },
  "gpt-5.5": { label: "GPT-5.5", provider: "openai", model: "gpt-5.5" },
  "claude-haiku-5-5": { label: "Claude Haiku 5.5", provider: "anthropic", model: "claude-haiku-5-5" },
  "claude-sonnet-5-5": { label: "Claude Sonnet 5.5", provider: "anthropic", model: "claude-sonnet-5-5" },
  "gemini-3.5-flash": { label: "Gemini 3.5 Flash", provider: "gemini", model: "gemini-3.5-flash" },
};

export const DEFAULT_MODEL = "gpt-5.4-mini";

const SYSTEM_PROMPT =
  "You are DarkGPT, a helpful AI text assistant. Answer clearly and use Markdown formatting where it helps readability.";

export async function complete(modelKey: string, history: ChatMessage[], system = SYSTEM_PROMPT): Promise<string> {
  const entry = MODELS[modelKey] ?? MODELS[DEFAULT_MODEL];

  if (entry.provider === "openai") {
    const openai = new OpenAI();
    const res = await openai.chat.completions.create({
      model: entry.model,
      messages: [{ role: "system", content: system }, ...history],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  if (entry.provider === "anthropic") {
    const anthropic = new Anthropic();
    const res = await anthropic.messages.create({
      model: entry.model,
      max_tokens: 4096,
      system,
      messages: history,
    });
    return res.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  }

  const ai = new GoogleGenAI({});
  const res = await ai.models.generateContent({
    model: entry.model,
    config: { systemInstruction: system },
    contents: history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
  });
  return res.text ?? "";
}
