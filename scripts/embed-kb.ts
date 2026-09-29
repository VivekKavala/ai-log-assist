// Run once (and whenever kb.json changes): npm run embed
import { readFileSync, writeFileSync } from "node:fs";
import { embedBatch } from "../lib/embed";

type Entry = { id: string; title: string; symptoms: string; causes: string[]; patterns: string[]; tool: string };

async function main() {
  const kb: Entry[] = JSON.parse(readFileSync("data/kb.json", "utf8"));
  const texts = kb.map((e) => `${e.tool}: ${e.title}. ${e.symptoms} Causes: ${e.causes.join("; ")}. Errors: ${e.patterns.join(", ")}`);
  const out: { id: string; vector: number[] }[] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const vecs = await embedBatch(texts.slice(i, i + 50), "RETRIEVAL_DOCUMENT");
    vecs.forEach((v, j) => out.push({ id: kb[i + j].id, vector: v }));
  }
  writeFileSync("data/kb-embeddings.json", JSON.stringify(out));
  console.log(`Embedded ${out.length} KB entries (dim ${out[0]?.vector.length}).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
