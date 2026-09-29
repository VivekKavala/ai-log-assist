// Minimal Supabase REST client (no SDK). Returns null/false when not configured.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

export const storeEnabled = () => Boolean(URL_ && KEY);

const headers = () => ({
  apikey: KEY as string,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
});

export async function saveFeedback(row: { useful: boolean; format: string; summary: string; sources: string[] }) {
  if (!storeEnabled()) return false;
  const res = await fetch(`${URL_}/rest/v1/feedback`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Store error ${res.status}: ${await res.text()}`);
  return true;
}

export async function getStats(): Promise<{ total: number; useful: number; pct: number } | null> {
  if (!storeEnabled()) return null;
  const res = await fetch(`${URL_}/rest/v1/feedback?select=useful&limit=10000`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Store error ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { useful: boolean }[];
  const useful = rows.filter((r) => r.useful).length;
  return { total: rows.length, useful, pct: rows.length ? Math.round((useful / rows.length) * 100) : 0 };
}
