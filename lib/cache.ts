import { cosine } from "./embed";
import type { Analysis } from "./llm";
import type { KBEntry } from "./retrieve";

type CacheRow = {
  vector: number[];
  result: Analysis;
  sources: { id: string; title: string; tool: string; score: number }[];
  hits: number;
};

// In-memory, per server instance. Resets on redeploy/cold start — fine for a demo.
const CACHE: CacheRow[] = [];
const THRESHOLD = Number(process.env.CACHE_SIMILARITY_THRESHOLD ?? 0.93);
const MAX_ROWS = 200;

export function lookupCache(vector: number[] | null): CacheRow | null {
  if (!vector || CACHE.length === 0) return null;
  let best: CacheRow | null = null;
  let bestScore = 0;
  for (const row of CACHE) {
    const s = cosine(vector, row.vector);
    if (s > bestScore) { bestScore = s; best = row; }
  }
  if (best && bestScore >= THRESHOLD) {
    best.hits++;
    return best;
  }
  return null;
}

export function storeCache(
  vector: number[] | null,
  result: Analysis,
  sources: { id: string; title: string; tool: string; score: number }[]
) {
  if (!vector) return;
  if (CACHE.length >= MAX_ROWS) CACHE.shift(); // simple FIFO eviction
  CACHE.push({ vector, result, sources, hits: 0 });
}

export function cacheStats() {
  return { size: CACHE.length, totalHits: CACHE.reduce((a, r) => a + r.hits, 0) };
}
