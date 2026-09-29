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

  const getSeverityBadgeClass = (severity: string) => {
    switch(severity.toLowerCase()) {
      case 'low': return 'badge-low';
      case 'medium': return 'badge-medium';
      case 'high': return 'badge-high';
      case 'critical': return 'badge-critical';
      default: return '';
    }
  };

  return (
    <main className="main-container">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="title">Deployment Troubleshooting Assistant</h1>
          <p className="subtitle">Paste a deployment log or error. Get a summary, probable causes and next steps.</p>
        </div>
        <div className="flex justify-center items-center">
        <a
          href="https://github.com/VivekKavala/ai-log-assist"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex items-center gap-2"
          style={{ textDecoration: "none", fontSize: "0.9rem", padding: "0.5rem 0.9rem" }}
          >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
          </div>
      </div>
      
      {stats && stats.total > 0 && (
        <p className="meta-text mb-4">
          Community Support: <strong style={{ color: stats.pct >= 80 ? 'var(--success)' : 'var(--warning)'}}>{stats.pct}%</strong> rated useful ({stats.useful}/{stats.total})
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} onClick={() => setLog(SAMPLES[k])} className="btn-outline">
            {k}
          </button>
        ))}
      </div>

      <textarea
        value={log}
        onChange={(e) => setLog(e.target.value)}
        placeholder="Paste your deployment log or stack trace here..."
        rows={12}
        className="modern-textarea mb-4"
      />
      
      <div className="mb-6">
        <button onClick={() => setShowAdvanced((v) => !v)} className="btn-ghost">
          <span style={{ fontSize: "1.2rem", transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▸</span> 
          Advanced options
        </button>
        
        {showAdvanced && (
          <div className="glass-panel flex-col gap-4 mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} className="modern-checkbox" />
              Use RAG (knowledge base retrieval)
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer" style={{ opacity: useRag ? 1 : 0.5, transition: "opacity 0.2s" }}>
              Retrieval mode:
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} disabled={!useRag} className="modern-select">
                <option value="hybrid">Hybrid (semantic + keyword)</option>
                <option value="semantic">Semantic only</option>
                <option value="keyword">Keyword only</option>
              </select>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showMetrics} onChange={(e) => setShowMetrics(e.target.checked)} className="modern-checkbox" />
              Show advanced metrics after analysis
            </label>
            
            <div className="mt-4 pt-4 border-t" style={{ borderTop: "1px solid var(--glass-border)" }}>
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={() => { setShowEval((v) => !v); if (!showEval && !evalResults) runEval(); }} className="btn-secondary">
                  {showEval ? "Hide evaluation" : "Run retrieval evaluation"}
                </button>
                <span className="meta-text">Checks 23 known logs against the knowledge base (no LLM calls)</span>
              </div>
              
              {showEval && (
                <div className="mt-4">
                  {evalLoading && <p className="meta-text">Running validation test suite...</p>}
                  {evalResults && (
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Retrieval Mode</th>
                          <th>Success Rate (Hit/Total)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalResults.map((r) => (
                          <tr key={r.mode}>
                            <td style={{ textTransform: 'capitalize' }}>{r.mode}</td>
                            <td>
                              <span style={{ color: r.pct >= 80 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                                {r.hit}/{r.total} ({r.pct}%)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <button onClick={run} disabled={loading || log.trim().length < 10} className="btn-primary flex items-center gap-2">
          {loading ? (
            <><span className="spinner" style={{ animation: "spin 1s linear infinite" }}>⏳</span> Analyzing...</>
          ) : "✨ Analyze Issue"}
        </button>
        <button onClick={runCompare} disabled={compareLoading || log.trim().length < 10} className="btn-secondary">
          {compareLoading ? "Running benchmark..." : "Compare RAG on vs off"}
        </button>
      </div>

      {error && <div className="error-banner flex items-center gap-3 mt-6">⚠️ {error}</div>}

      {compare && (
        <div className="glass-panel mt-6">
          <h3 className="mb-4 text-xl">RAG Performance Comparison</h3>
          <div className="compare-grid">
            {[{ label: "With RAG Integration", r: compare.withRag }, { label: "Standard LLM (No RAG)", r: compare.withoutRag }].map(({ label, r }) => (
              <div key={label} className="compare-card">
                <div className="flex justify-between items-center mb-3">
                  <h4 style={{ margin: 0, color: 'white' }}>{label}</h4>
                  <span className={`badge ${getSeverityBadgeClass(r.result.severity)}`}>{r.result.severity}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{r.result.summary}</p>
                <div className="mt-4">
                  <h5 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Root Causes</h5>
                  <ul className="ordered-list" style={{ fontSize: '0.9rem' }}>
                    {r.result.causes.map((c, i) => (
                      <li key={i}>
                        {c.cause} <span className="meta-text ml-2">({Math.round(c.confidence * 100)}% match)</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {r.sources.length > 0 && (
                  <div className="mt-4 pt-3" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p className="meta-text block mt-2" style={{ fontSize: '0.8rem' }}>📌 Sources: {r.sources.map((s) => s.title).join(", ")}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="meta-text mt-4">
            * Note: Without RAG, causes are hallucinated from the model's generalized pre-training instead of your specific organization context.
          </p>
        </div>
      )}

      {data && (
        <div className="flex-col gap-4 mt-6 fade-in" style={{ animation: "fadeIn 0.4s ease-in" }}>
          <div className="glass-panel">
            <div className="glass-panel-header">
              <h3 style={{ margin: 0 }}>Executive Summary</h3>
              <div className="flex items-center gap-3">
                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>MODEL: {data.format}</span>
                <span className={`badge ${getSeverityBadgeClass(data.result.severity)}`}>{data.result.severity} Issue</span>
                {data.cached && <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>⚡ Cache Hit</span>}
              </div>
            </div>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>{data.result.summary}</p>
          </div>
          
          <div className="compare-grid mt-2">
            <div className="glass-panel">
              <h3 className="mb-4">Probable Causes</h3>
              {data.result.causes.map((c, i) => (
                <div key={i} className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i + 1}.</span> 
                    <span>{c.cause}</span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{Math.round(c.confidence * 100)}% confidence</span>
                  </div>
                  <div className="code-block">{c.evidence}</div>
                </div>
              ))}
            </div>
            </div>
          <div className="compare-grid mt-2">
            <div className="glass-panel">
              <h3 className="mb-4">Recommended Next Steps</h3>
              <ul className="ordered-list" style={{ lineHeight: 1.7 }}>
                {data.result.next_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              
              {data.sources.length > 0 && (
                <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>References Consulted</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.sources.map((s) => (
                       <span key={s.id} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontWeight: 500 }}>📘 {s.title}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showMetrics && data.meta && (
            <div className="glass-panel mt-2">
              <h3 className="mb-4">Advanced Diagnostics</h3>
              <ul className="ordered-list meta-text">
                <li>RAG Pipeline: <strong>{data.meta.ragUsed ? `Active (${data.meta.mode} mode)` : "Bypassed"}</strong></li>
                <li>Processing Latency: <strong>{data.meta.latencyMs}ms</strong> {data.cached ? "(Cached)" : ""}</li>
                {data.meta.kbSize && <li>Knowledge Base Space: <strong>{data.meta.kbSize} vectors searched</strong></li>}
                {data.sources.length > 0 && (
                  <li className="mt-2">
                    Vector Distances:
                    <ul className="mt-1">
                      {data.sources.map((s) => (
                        <li key={s.id}>
                          {s.title} — score(total={s.score}, sem={s.semantic}, kw={s.keyword})
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
          
          <div className="glass-panel mt-2 flex items-center justify-between">
            {voted === null ? (
              <>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0' }}>Help us improve</h4>
                  <span className="meta-text">Was this analysis accurate and useful?</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => vote(true)} className="btn-secondary flex items-center gap-2">👍 Yes</button>
                  <button onClick={() => vote(false)} className="btn-secondary flex items-center gap-2">👎 No</button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 w-full justify-center">
                <span style={{ fontSize: '1.2rem' }}>🎉</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Thanks for helping improve the RAG model!</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </main>
  );
}
