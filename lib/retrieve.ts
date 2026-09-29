import kb from "@/data/kb.json";
import embeddings from "@/data/kb-embeddings.json";
import { cosine, embedQuery } from "./embed";

export type KBEntry = {
  id: string;
  tool: string;
  title: string;
  patterns: string[];
  symptoms: string;
  causes: string[];
  fix_steps: string[];
  severity: string;
};
export type Hit = { entry: KBEntry; score: number; semantic: number; keyword: number };
export type Mode = "keyword" | "semantic" | "hybrid";
export type RetrieveResult = { hits: Hit[]; queryVector: number[] | null; mode: Mode };

const entries = kb as KBEntry[];
const vectors = new Map((embeddings as { id: string; vector: number[] }[]).map((e) => [e.id, e.vector]));

const W_SEM = 0.6;
const W_KW = 0.4;
const MIN_SCORE = Number(process.env.RETRIEVAL_MIN_SCORE ?? 0.45);

/** 0..1: exact error-pattern hits, saturating at 2 matches. */
function keywordScore(entry: KBEntry, text: string): number {
  let hits = 0;
  for (const p of entry.patterns) {
    try {
      if (new RegExp(p, "i").test(text)) hits++;
    } catch {
      if (text.toLowerCase().includes(p.toLowerCase())) hits++;
    }
  }
  return Math.min(hits / 2, 1);
}

/** Returns KB hits plus the query embedding (reused by the semantic cache), or null if embedding failed.
 *  modeOverride lets the UI/eval script force a mode instead of using the env default. */
export async function retrieve(text: string, k = 4, modeOverride?: Mode): Promise<RetrieveResult> {
  let mode: Mode = modeOverride || (process.env.RETRIEVAL_MODE as Mode) || "hybrid";
  let qVec: number[] | null = null;

  if (mode !== "keyword") {
    try {
      if (vectors.size === 0) throw new Error("no KB embeddings (run npm run embed)");
      qVec = await embedQuery(text);
    } catch (e) {
      console.warn("Semantic retrieval unavailable, falling back to keyword:", e);
      mode = "keyword";
    }
  }

  const hits: Hit[] = entries.map((entry) => {
    const keyword = keywordScore(entry, text);
    const v = vectors.get(entry.id);
    const semantic = qVec && v ? cosine(qVec, v) : 0;
    const score = mode === "keyword" ? keyword : mode === "semantic" ? semantic : W_SEM * semantic + W_KW * keyword;
    return { entry, score, semantic, keyword };
  });

  const min = mode === "keyword" ? 0.5 : MIN_SCORE;
  const top = hits.filter((h) => h.score >= min).sort((a, b) => b.score - a.score).slice(0, k);
  return { hits: top, queryVector: qVec, mode };
}
