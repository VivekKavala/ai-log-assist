import { NextResponse } from "next/server";
import { saveFeedback } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (typeof b.useful !== "boolean") return NextResponse.json({ error: "useful (boolean) required" }, { status: 400 });
    const stored = await saveFeedback({
      useful: b.useful,
      format: String(b.format ?? "").slice(0, 50),
      summary: String(b.summary ?? "").slice(0, 1000),
      sources: Array.isArray(b.sources) ? b.sources.map(String).slice(0, 10) : [],
    });
    return NextResponse.json({ ok: true, stored });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
