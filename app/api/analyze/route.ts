import { NextResponse } from "next/server";
import { preprocess } from "@/lib/preprocess";
import { retrieve, type Mode } from "@/lib/retrieve";
import { analyze } from "@/lib/llm";
import { lookupCache, storeCache } from "@/lib/cache";

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const { log, useRag = true, mode } = await req.json();
    if (typeof log !== "string" || log.trim().length < 10) {
      return NextResponse.json({ error: "Please provide a log (at least a few lines)." }, { status: 400 });
    }
    const { format, errors } = preprocess(log.slice(0, 200_000));

    if (!useRag) {
      // RAG off: no KB retrieval, no semantic cache (nothing to key it on), straight LLM call.
      const result = await analyze(format, errors, []);
      return NextResponse.json({
        format, result, sources: [], cached: false,
        meta: { ragUsed: false, mode: "off" as const, latencyMs: Date.now() - t0 },
      });
    }

    const { hits, queryVector, mode: usedMode } = await retrieve(errors, 4, mode as Mode | undefined);

    const cached = lookupCache(queryVector);
    if (cached) {
      return NextResponse.json({
        format, result: cached.result, sources: cached.sources, cached: true,
        meta: { ragUsed: true, mode: usedMode, latencyMs: Date.now() - t0 },
      });
    }

    const result = await analyze(format, errors, hits.map((h) => h.entry));
    const sources = hits.map((h) => ({
      id: h.entry.id, title: h.entry.title, tool: h.entry.tool,
      score: Number(h.score.toFixed(2)), semantic: Number(h.semantic.toFixed(2)), keyword: Number(h.keyword.toFixed(2)),
    }));
    storeCache(queryVector, result, sources);

    return NextResponse.json({
      format, result, sources, cached: false,
      meta: { ragUsed: true, mode: usedMode, latencyMs: Date.now() - t0, kbSize: 43 },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
