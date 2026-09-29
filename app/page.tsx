"use client";
import { useEffect, useState } from "react";
import { SAMPLES } from "@/lib/samples";

type Analysis = {
  summary: string;
  causes: { cause: string; confidence: number; evidence: string }[];
  next_steps: string[];
  severity: string;
};
type Source = { id: string; title: string; tool: string; score?: number; semantic?: number; keyword?: number };
type Meta = { ragUsed: boolean; mode: string; latencyMs: number; kbSize?: number };
type EvalResult = { mode: string; hit: number; total: number; pct: number; misses: string[] };
type Response = { format: string; result: Analysis; sources: Source[]; cached?: boolean; meta?: Meta };

const card = { background: "#1e293b", borderRadius: 10, padding: 16, marginTop: 16 } as const;
const sevColor: Record<string, string> = { low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444" };

export default function Home() {
  const [log, setLog] = useState("");
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voted, setVoted] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ total: number; useful: number; pct: number } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [mode, setMode] = useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [showMetrics, setShowMetrics] = useState(false);

  const [evalResults, setEvalResults] = useState<EvalResult[] | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [showEval, setShowEval] = useState(false);

  const [compare, setCompare] = useState<{ withRag: Response; withoutRag: Response } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  async function loadStats() {
    try {
      const r = await fetch("/api/stats");
      setStats((await r.json()).stats);
    } catch {}
  }
  useEffect(() => { loadStats(); }, []);

  async function runEval() {
    setEvalLoading(true);
    setEvalResults(null);
    try {
      const r = await fetch("/api/eval");
      const json = await r.json();
      if (r.ok) setEvalResults(json.results);
    } finally {
      setEvalLoading(false);
    }
  }

  async function runCompare() {
    if (log.trim().length < 10) return;
    setCompareLoading(true);
    setCompare(null);
    try {
      const call = (useRagFlag: boolean) =>
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ log, useRag: useRagFlag, mode }),
        }).then((r) => r.json());
      const [withRag, withoutRag] = await Promise.all([call(true), call(false)]);
      setCompare({ withRag, withoutRag });
    } finally {
      setCompareLoading(false);
    }
  }

  async function vote(useful: boolean) {
    if (!data) return;
    setVoted(useful);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useful, format: data.format, summary: data.result.summary, sources: data.sources.map((s) => s.id) }),
    });
    loadStats();
  }

  async function run() {
    setLoading(true);
    setError("");
    setData(null);
    setVoted(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log, useRag, mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Deployment Troubleshooting Assistant</h1>
      <p style={{ color: "#94a3b8", marginTop: 0 }}>Paste a deployment log or error. Get a summary, probable causes and next steps.</p>
      {stats && stats.total > 0 && (
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>
          Usefulness: <strong style={{ color: stats.pct >= 80 ? "#22c55e" : "#eab308" }}>{stats.pct}%</strong> ({stats.useful}/{stats.total} rated useful)
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} onClick={() => setLog(SAMPLES[k])} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", cursor: "pointer" }}>
            {k}
          </button>
        ))}
      </div>

      <textarea
        value={log}
        onChange={(e) => setLog(e.target.value)}
        placeholder="Paste log here..."
        rows={12}
        style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 8, border: "1px solid #334155", background: "#020617", color: "#e2e8f0", fontFamily: "monospace" }}
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={() => setShowAdvanced((v) => !v)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, fontSize: 13 }}>
          {showAdvanced ? "▾" : "▸"} Advanced options
        </button>
        {showAdvanced && (
          <div style={{ ...card, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
              Use RAG (knowledge base retrieval)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, opacity: useRag ? 1 : 0.4 }}>
              Retrieval mode:
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} disabled={!useRag} style={{ background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 6, padding: "4px 8px" }}>
                <option value="hybrid">Hybrid (semantic + keyword)</option>
                <option value="semantic">Semantic only</option>
                <option value="keyword">Keyword only</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={showMetrics} onChange={(e) => setShowMetrics(e.target.checked)} />
              Show advanced metrics after analysis
            </label>
            <div style={{ borderTop: "1px solid #334155", paddingTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => { setShowEval((v) => !v); if (!showEval && !evalResults) runEval(); }}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", cursor: "pointer" }}>
                {showEval ? "Hide" : "Run"} retrieval evaluation
              </button>
              <span style={{ color: "#64748b", fontSize: 12 }}>Checks 23 known logs against the knowledge base (no LLM calls)</span>
            </div>
            {showEval && (
              <div>
                {evalLoading && <p style={{ color: "#94a3b8" }}>Running eval...</p>}
                {evalResults && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#94a3b8" }}>
                        <th style={{ padding: "4px 8px" }}>Mode</th>
                        <th style={{ padding: "4px 8px" }}>Hit rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evalResults.map((r) => (
                        <tr key={r.mode} style={{ borderTop: "1px solid #334155" }}>
                          <td style={{ padding: "4px 8px" }}>{r.mode}</td>
                          <td style={{ padding: "4px 8px" }}>
                            <span style={{ color: r.pct >= 80 ? "#22c55e" : "#eab308" }}>{r.hit}/{r.total} ({r.pct}%)</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={run} disabled={loading || log.trim().length < 10} style={{ marginTop: 8, padding: "10px 18px", borderRadius: 8, border: 0, background: "#3b82f6", color: "white", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
        <button onClick={runCompare} disabled={compareLoading || log.trim().length < 10} style={{ marginTop: 8, padding: "10px 18px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#e2e8f0", cursor: "pointer", opacity: compareLoading ? 0.6 : 1 }}>
          {compareLoading ? "Comparing..." : "Compare RAG on vs off"}
        </button>
      </div>

      {error && <div style={{ ...card, background: "#450a0a" }}>{error}</div>}

      {compare && (
        <div style={card}>
          <strong>RAG comparison</strong>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[{ label: "With RAG", r: compare.withRag }, { label: "Without RAG", r: compare.withoutRag }].map(({ label, r }) => (
              <div key={label} style={{ flex: "1 1 260px", background: "#0f172a", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{label}</strong>
                  <span style={{ color: sevColor[r.result.severity] ?? "#e2e8f0", fontSize: 13 }}>{r.result.severity}</span>
                </div>
                <p style={{ fontSize: 13, color: "#cbd5e1" }}>{r.result.summary}</p>
                <ol style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
                  {r.result.causes.map((c, i) => (
                    <li key={i}>{c.cause} <span style={{ color: "#94a3b8" }}>({Math.round(c.confidence * 100)}%)</span></li>
                  ))}
                </ol>
                {r.sources.length > 0 && (
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0 }}>KB used: {r.sources.map((s) => s.title).join(", ")}</p>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0 }}>
            Without RAG, causes come from the model's general knowledge only — no grounding in the known-error knowledge base.
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Summary</strong>
              <span>
                <span style={{ color: "#94a3b8" }}>{data.format} · </span>
                <span style={{ color: sevColor[data.result.severity] ?? "#e2e8f0" }}>{data.result.severity}</span>
                {data.cached && <span style={{ marginLeft: 8, fontSize: 12, color: "#38bdf8" }}>⚡ served from cache</span>}
              </span>
            </div>
            <p>{data.result.summary}</p>
          </div>
          <div style={card}>
            <strong>Probable causes</strong>
            {data.result.causes.map((c, i) => (
              <div key={i} style={{ marginTop: 10 }}>
                {i + 1}. {c.cause} <span style={{ color: "#94a3b8" }}>({Math.round(c.confidence * 100)}%)</span>
                <pre style={{ margin: "4px 0 0", color: "#94a3b8", whiteSpace: "pre-wrap" }}>{c.evidence}</pre>
              </div>
            ))}
          </div>
          <div style={card}>
            <strong>Next steps</strong>
            <ol>{data.result.next_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
          {data.sources.length > 0 && (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>KB sources: {data.sources.map((s) => s.title).join(", ")}</p>
          )}
          {showMetrics && data.meta && (
            <div style={card}>
              <strong>Advanced metrics</strong>
              <ul style={{ color: "#94a3b8", fontSize: 13, paddingLeft: 18, marginBottom: 0 }}>
                <li>RAG: {data.meta.ragUsed ? `on (${data.meta.mode})` : "off"}</li>
                <li>Latency: {data.meta.latencyMs} ms{data.cached ? " (cache hit)" : ""}</li>
                {data.meta.kbSize && <li>KB entries searched: {data.meta.kbSize}</li>}
                {data.sources.length > 0 && (
                  <li>
                    Retrieval scores:{" "}
                    {data.sources.map((s) => `${s.title} [total ${s.score} = sem ${s.semantic} + kw ${s.keyword}]`).join("; ")}
                  </li>
                )}
              </ul>
            </div>
          )}
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
            {voted === null ? (
              <>
                <span>Was this useful?</span>
                <button onClick={() => vote(true)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", cursor: "pointer" }}>👍 Yes</button>
                <button onClick={() => vote(false)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", cursor: "pointer" }}>👎 No</button>
              </>
            ) : (
              <span style={{ color: "#94a3b8" }}>Thanks for the feedback.</span>
            )}
          </div>
        </>
      )}
    </main>
  );
}
