const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 10_000, retries = 1): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      if (attempt >= retries) throw e;
      // brief backoff before the single retry
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export async function embedBatch(texts: string[], taskType: TaskType): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetchWithTimeout(`${BASE}/models/${EMBED_MODEL}:batchEmbedContents?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((t) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: t }] },
        taskType,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.embeddings as { values: number[] }[]).map((e) => e.values);
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embedBatch([text.slice(0, 2000)], "RETRIEVAL_QUERY"))[0];
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
