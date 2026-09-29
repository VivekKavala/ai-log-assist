export type LogFormat = "kubernetes" | "docker" | "npm" | "maven" | "github-actions" | "jenkins" | "generic";

const ERROR_RE = /(error|fail|fatal|exception|denied|refused|timeout|timed out|killed|backoff|exit code|cannot|unable|not found)/i;
const TS_RE = /^\s*(\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?\]?|\d{2}:\d{2}:\d{2})\s*/;
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function detectFormat(log: string): LogFormat {
  if (/kubectl|CrashLoopBackOff|ImagePullBackOff|OOMKilled|FailedScheduling|Events:/i.test(log)) return "kubernetes";
  if (/npm ERR!|ERESOLVE|yarn error|heap out of memory/i.test(log)) return "npm";
  if (/\[INFO\].*maven|\[ERROR\].*Failed to execute goal|BUILD FAILURE/i.test(log)) return "maven";
  if (/##\[error\]|::error::|Run actions\//i.test(log)) return "github-actions";
  if (/Started by user|\[Pipeline\]/i.test(log)) return "jenkins";
  if (/Step \d+\/\d+|docker build|COPY failed|port is already allocated/i.test(log)) return "docker";
  return "generic";
}

export function normalize(log: string): string {
  return log
    .replace(ANSI_RE, "")
    .split(/\r?\n/)
    .map((l) => l.replace(TS_RE, "").trimEnd())
    .filter((l) => l.length > 0)
    .join("\n");
}

/** Keep error lines with +-2 lines of context; cap total size. */
export function extractErrorWindows(log: string, context = 2, maxChars = 6000): string {
  const lines = log.split("\n");
  const keep = new Set<number>();
  lines.forEach((l, i) => {
    if (ERROR_RE.test(l)) {
      for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) keep.add(j);
    }
  });
  if (keep.size === 0) return lines.slice(-40).join("\n").slice(-maxChars);
  const out: string[] = [];
  let prev = -2;
  [...keep].sort((a, b) => a - b).forEach((i) => {
    if (i - prev > 1) out.push("...");
    out.push(lines[i]);
    prev = i;
  });
  const text = out.join("\n");
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

export function preprocess(raw: string) {
  const normalized = normalize(raw);
  return { format: detectFormat(raw), errors: extractErrorWindows(normalized) };
}
