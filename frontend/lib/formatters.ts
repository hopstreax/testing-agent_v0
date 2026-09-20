/**
 * Shared formatters and timestamp parsers for TraceKit runs.
 */

/**
 * Extract timestamp in milliseconds from created_at ISO string
 * or fallback to regex parsing YYYYMMDD_HHMMSS from the run_id.
 */
export function getRunTimestamp(createdAt: string | undefined, runId: string): number {
  if (createdAt && createdAt.trim()) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }

  // Fallback: parse YYYYMMDD_HHMMSS prefix from run_id
  const match = runId.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    const date = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      parseInt(h, 10),
      parseInt(min, 10),
      parseInt(s, 10)
    );
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return 0;
}

/**
 * Robust date formatter handling both ISO strings and YYYYMMDD_HHMMSS run IDs.
 */
export function formatRunDate(createdAt: string | undefined, runId: string): string {
  const timestamp = getRunTimestamp(createdAt, runId);
  if (timestamp > 0) {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return runId;
}

/**
 * Calculate human-friendly relative time (e.g. "12m ago", "2h ago", "yesterday").
 * Falls back to formatRunDate if difference is older than a week.
 */
export function formatRelativeTime(
  createdAt: string | undefined,
  runId: string
): string {
  const timestamp = getRunTimestamp(createdAt, runId);
  if (timestamp === 0) return "";

  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatRunDate(createdAt, runId);
}

/**
 * Format execution duration consistently with TraceKit Run Detail.
 */
export function formatDuration(
  durationMs: number | null | undefined,
  status?: string
): string {
  if (status === "running") return "Running";
  if (durationMs == null) return "—";
  return `${(durationMs / 1000).toFixed(1)}s`;
}

/**
 * Extract clean hostname from target URL for contextual badges.
 */
export function extractHostname(urlString: string): string {
  try {
    const parsed = new URL(
      urlString.startsWith("http") ? urlString : `https://${urlString}`
    );
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return urlString.split("/")[0] || urlString;
  }
}
