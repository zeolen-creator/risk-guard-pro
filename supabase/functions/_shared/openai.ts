export type OpenAIChatRequest = RequestInit;
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4.1-mini";
/** Server-side OpenAI Chat Completions client. API keys stay inside Edge Functions. */
export async function openAIChatCompletions(request: OpenAIChatRequest): Promise<Response> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (typeof request.body !== "string") throw new Error("OpenAI request body must be JSON");
  const payload = JSON.parse(request.body) as Record<string, unknown>;
  return fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: request.method || "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, model: DEFAULT_MODEL }),
  });
}
