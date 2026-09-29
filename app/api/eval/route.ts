import { NextResponse } from "next/server";
import evalSet from "@/data/eval-set.json";
import { preprocess } from "@/lib/preprocess";
import { retrieve, type Mode } from "@/lib/retrieve";

export const dynamic = "force-dynamic";

type Case = { name: string; log: string; expectedId: string };

// Retrieval-only eval (no LLM calls) — same logic as scripts/eval-retrieval.ts,
// exposed as an API so it can be run from the UI instead of the CLI.
export async function GET() {
  try {
    const cases = evalSet as Case[];
    const modes: Mode[] = ["keyword", "semantic", "hybrid"];
    const results = [];
    for (const mode of modes) {
      let hit = 0;
      const misses: string[] = [];
      for (const c of cases) {
        const { errors } = preprocess(c.log);
        const { hits } = await retrieve(errors, 4, mode);
        if (hits.some((h) => h.entry.id === c.expectedId)) hit++; else misses.push(c.name);
      }
      results.push({ mode, hit, total: cases.length, pct: Math.round((hit / cases.length) * 100), misses });
    }
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
