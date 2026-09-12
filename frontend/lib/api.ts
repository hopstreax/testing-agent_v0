/**
 * Typed API client for TraceKit FastAPI backend.
 * All requests use relative /api paths which are proxied via Next.js rewrites.
 */

export interface RunRequest {
  url: string;
  goal: string;
  browser: "local" | "solari";
  headless: boolean;
  max_steps: number;
  storage_state_path?: string;
}

export interface RunLaunchResponse {
  run_id: string;
  status: "running";
  url: string;
  goal: string;
}

export interface FailureDiagnosis {
  classification: "APPLICATION_BEHAVIOR_MISMATCH" | "AUTOMATION_FAILURE";
  cause:
    | "ASSERTION_FAILED"
    | "LOCATOR_NOT_FOUND"
    | "NAVIGATION_ERROR"
    | "APPLICATION_CRASH"
    | "AGENT_STAGNATION"
    | "BUDGET_EXCEEDED"
    | "PROVIDER_ERROR"
    | "SESSION_ERROR"
    | "UNKNOWN_FAILURE";
  summary: string;
}

export interface AssertionRecord {
  step_number: number;
  assertion_type: string;
  expected_value: string | null;
  locator: Record<string, string>;
  success: boolean;
  error_message: string | null;
  screenshot_path: string | null;
}

export interface StepTraceRecord {
  step_number: number;
  action_type: string;
  action_details: Record<string, unknown>;
  decision: string;
  observation_summary: string;
  result: {
    success: boolean;
    duration_ms: number;
    resolved_by: string | null;
    error_message: string | null;
  };
  screenshot_path: string | null;
}

export interface BrowserDiagnostics {
  console_errors?: number;
  page_errors?: number;
  failed_requests?: number;
  recent_console_errors?: string[];
  recent_failed_requests?: string[];
}

export interface RunResult {
  run_id: string;
  goal: string;
  target_url: string;
  success: boolean;
  termination_reason:
    | "goal_achieved"
    | "goal_failed"
    | "max_steps_exceeded"
    | "stagnation_detected"
    | "unrecoverable_error"
    | "cancelled";
  message: string;
  duration_ms: number;
  steps_executed: number;
  diagnosis: FailureDiagnosis | null;
  assertions: AssertionRecord[];
  steps: StepTraceRecord[];
  diagnostics?: BrowserDiagnostics;
  screenshots: string[];
}

export interface RunArtifacts {
  report_json: string;
  report_md: string;
}

export interface RunSummary {
  run_id: string;
  status: "running" | "completed" | "failed" | "error";
  url: string;
  goal: string;
  created_at: string;
  duration_ms: number | null;
  success: boolean | null;
}

export interface RunStatusResponse {
  run_id: string;
  status: "running" | "completed" | "failed" | "error";
  url: string;
  goal: string;
  browser: "local" | "solari";
  headless: boolean;
  created_at: string;
  duration_ms: number | null;
  result: RunResult | null;
  error: string | null;
  artifacts: RunArtifacts | null;
}

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Launch a new autonomous website test run.
 * POST /api/runs -> returns 202 Accepted with RunLaunchResponse
 */
export async function launchRun(request: RunRequest): Promise<RunLaunchResponse> {
  const res = await fetch("/api/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let errorDetail = `Failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        if (typeof errJson.detail === "string") {
          errorDetail = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          errorDetail = errJson.detail.map((d: { msg?: string }) => d.msg || "").join("; ");
        }
      }
    } catch {
      // Use fallback errorDetail
    }
    throw new ApiError(errorDetail, res.status, errorDetail);
  }

  return res.json();
}

/**
 * Retrieve execution status and full structured results for a run.
 * GET /api/runs/{run_id}
 */
export async function getRun(runId: string): Promise<RunStatusResponse> {
  const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorDetail = `Failed to fetch run (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Use fallback
    }
    throw new ApiError(errorDetail, res.status, errorDetail);
  }

  return res.json();
}

/**
 * Retrieve list of recent test runs.
 * GET /api/runs
 */
export async function listRuns(): Promise<RunSummary[]> {
  const res = await fetch("/api/runs", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorDetail = `Failed to fetch runs (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Use fallback
    }
    throw new ApiError(errorDetail, res.status, errorDetail);
  }

  return res.json();
}
