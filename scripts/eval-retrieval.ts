// Retrieval-only eval (no LLM calls): measures whether the correct KB entry
// appears in the top-k for keyword / semantic / hybrid modes.
// Run: npm run eval   (needs GEMINI_API_KEY + npm run embed done first, for semantic/hybrid)
import { readFileSync } from "node:fs";
import { preprocess } from "../lib/preprocess";
import { retrieve, type Mode } from "../lib/retrieve";

type Case = { name: string; log: string; expectedId: string };

async function runMode(cases: Case[], mode: Mode) {
  let hit = 0;
  const misses: string[] = [];
  for (const c of cases) {
    const { errors } = preprocess(c.log);
    const { hits } = await retrieve(errors, 4, mode);
    const found = hits.some((h) => h.entry.id === c.expectedId);
    if (found) hit++; else misses.push(c.name);
  }
  return { mode, hit, total: cases.length, pct: Math.round((hit / cases.length) * 100), misses };
}

async function main() {
  const cases: Case[] = JSON.parse(readFileSync("data/eval-set.json", "utf8"));
  console.log(`Evaluating retrieval on ${cases.length} test logs...\n`);
  for (const mode of ["keyword", "semantic", "hybrid"] as Mode[]) {
    const r = await runMode(cases, mode);
    console.log(`${mode.padEnd(9)} ${String(r.hit).padStart(2)}/${r.total}  (${r.pct}%)`);
    if (r.misses.length) console.log(`  missed: ${r.misses.join(", ")}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
