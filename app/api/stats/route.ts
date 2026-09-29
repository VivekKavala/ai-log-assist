import { NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ stats: await getStats() });
  } catch {
    return NextResponse.json({ stats: null });
  }
}
