import type { Config } from "@netlify/functions";
import { complete } from "../../lib/ai.js";

const MIN_LENGTH = 50;
const MAX_LENGTH = 10000;

const SUMMARY_PROMPT =
  "You summarize text. Reply with a concise, faithful summary of the user's text in the same language as the text. " +
  "Use a short paragraph, followed by up to five bullet points with the key takeaways. Do not add information that is not in the text.";

export default async (req: Request) => {
  let text: string | undefined;
  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  text = text?.trim();
  if (!text || text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
    return Response.json(
      { error: `Please provide between ${MIN_LENGTH} and ${MAX_LENGTH.toLocaleString("en")} characters of text.` },
      { status: 400 },
    );
  }

  try {
    const summary = await complete("gpt-5.4-mini", [{ role: "user", content: text }], SUMMARY_PROMPT);
    return Response.json({ summary });
  } catch (err) {
    console.error("Summarization failed", err);
    return Response.json({ error: "Summarization failed. Please try again." }, { status: 502 });
  }
};

export const config: Config = {
  path: "/api/summarize",
  method: "POST",
};
