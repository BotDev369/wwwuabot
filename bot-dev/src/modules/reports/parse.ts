/**
 * Перевірка того, що прислав CI: алфавіт, довжини, межі кількості й рівно
 * `github.com` для посилань — у rich ці адреси стають кнопками.
 *
 * @module bot-dev/src/modules/reports/parse
 */

import { REPORT_STATUSES, type DeployReport, type ReportStatus } from "./types";

const RUN_ID = /^[0-9]{1,20}$/;
const SHA = /^[0-9a-fA-F]{7,40}$/;
const NAME = /^[A-Za-z0-9:_-]{1,40}$/;
const BRANCH = /^[A-Za-z0-9._/-]{1,80}$/;
const REPO = /^[A-Za-z0-9._-]{1,40}\/[A-Za-z0-9._-]{1,80}$/;
const GITHUB_URL = /^https:\/\/github\.com\/[A-Za-z0-9._/-]{1,200}$/;
const HTTPS_URL = /^https:\/\/[A-Za-z0-9.-]{1,80}(?::[0-9]{1,5})?(\/[A-Za-z0-9._/-]*)?$/;

const MAX_JOBS = 12;
const MAX_GATES = 40;
const MAX_LINES = 6;
const MAX_TEXT = 300;
const MAX_COUNT = 10_000_000;

export type ParseResult = { ok: true; report: DeployReport } | { ok: false; error: string };

function text(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > MAX_COUNT) return null;
  return Math.round(value);
}

function status(value: unknown): ReportStatus | null {
  return REPORT_STATUSES.includes(value as ReportStatus) ? (value as ReportStatus) : null;
}

function lines(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_LINES) return null;
  const out: string[] = [];
  for (const item of value) {
    const line = text(item);
    if (line === null) return null;
    if (line) out.push(line);
  }
  return out;
}

function jobs(value: unknown): DeployReport["jobs"] | null {
  if (!Array.isArray(value) || value.length > MAX_JOBS) return null;
  const out: DeployReport["jobs"] = [];
  for (const item of value) {
    const entry = item as { name?: unknown; status?: unknown };
    const name = text(entry?.name, 40);
    const state = status(entry?.status);
    if (!name || !NAME.test(name) || !state) return null;
    out.push({ name, status: state });
  }
  return out;
}

function gates(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_GATES) return null;
  const out: string[] = [];
  for (const item of value) {
    const name = text(item, 40);
    if (!name || !NAME.test(name)) return null;
    out.push(name);
  }
  return out;
}

/** Тіло запиту → перевірений звіт або код причини. Ніколи не кидає. */
export function parseDeployReport(raw: unknown): ParseResult {
  const input = raw as Record<string, unknown> | null;
  if (!input || typeof input !== "object") return { ok: false, error: "body" };

  const runId = text(input.run_id, 20);
  if (!runId || !RUN_ID.test(runId)) return { ok: false, error: "run_id" };

  const state = status(input.status);
  if (!state) return { ok: false, error: "status" };

  const sha = text(input.sha, 40);
  if (!sha || !SHA.test(sha)) return { ok: false, error: "sha" };

  const branch = text(input.branch, 80);
  if (!branch || !BRANCH.test(branch)) return { ok: false, error: "branch" };

  const repo = text(input.repo, 120);
  if (!repo || !REPO.test(repo)) return { ok: false, error: "repo" };

  const runUrl = text(input.run_url, 200);
  const commitUrl = text(input.commit_url, 200);
  if (!runUrl || !GITHUB_URL.test(runUrl)) return { ok: false, error: "run_url" };
  if (!commitUrl || !GITHUB_URL.test(commitUrl)) return { ok: false, error: "commit_url" };

  const platformUrl = text(input.platform_url ?? "", 200) ?? "";
  if (platformUrl && !HTTPS_URL.test(platformUrl)) return { ok: false, error: "platform_url" };

  const jobList = jobs(input.jobs);
  if (!jobList) return { ok: false, error: "jobs" };

  const gateList = gates(input.gates);
  if (!gateList) return { ok: false, error: "gates" };

  const commit = input.commit as Record<string, unknown> | undefined;
  const subject = text(commit?.subject);
  const author = text(commit?.author, 80);
  const files = count(commit?.files);
  const added = count(commit?.added);
  const removed = count(commit?.removed);
  if (!subject || author === null || files === null || added === null || removed === null) {
    return { ok: false, error: "commit" };
  }

  const notes = lines(input.notes);
  const limitations = lines(input.limitations);
  if (!notes) return { ok: false, error: "notes" };
  if (!limitations) return { ok: false, error: "limitations" };

  return {
    ok: true,
    report: {
      runId,
      status: state,
      sha: sha.toLowerCase(),
      branch,
      repo,
      runUrl,
      commitUrl,
      jobs: jobList,
      gates: gateList,
      commit: { subject, author, files, added, removed },
      notes,
      limitations,
      platformUrl,
    },
  };
}
