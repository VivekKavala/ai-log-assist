import type { KBEntry } from "./retrieve";

export type Analysis = {
  summary: string;
  causes: { cause: string; confidence: number; evidence: string }[];
  next_steps: string[];
  severity: "low" | "medium" | "high" | "critical";
};

const SYSTEM = `You are a DevOps troubleshooting assistant. Analyze the deployment log excerpt.
Use the provided knowledge base entries when relevant, but rely on the log as the source of truth.
Do not invent errors that are not in the log. If the log is inconclusive, say so and lower confidence.
Respond ONLY with JSON matching:
{"summary": string (2-3 sentences, plain language),
 "causes": [{"cause": string, "confidence": number 0-1, "evidence": string (quote a short log line)}] (max 3, ranked),
 "next_steps": string[] (concrete, ordered, include commands where useful),
 "severity": "low"|"medium"|"high"|"critical"}`;

export async function analyze(format: string, errors: string, kbHits: KBEntry[]): Promise<Analysis> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const kbText = kbHits.length
    ? kbHits.map((e) => `- [${e.tool}] ${e.title}: causes=${e.causes.join("; ")} | fixes=${e.fix_steps.join("; ")}`).join("\n")
    : "(no matching entries)";

  const prompt = `Detected format: ${format}\n\nKnowledge base entries:\n${kbText}\n\nLog excerpt:\n${errors}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(20_000),
    }
  );
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim()) as Analysis;
}
