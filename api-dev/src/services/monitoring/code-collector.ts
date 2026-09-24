/**
 * Колектор коду: архів гілки, розібраний наскрізь.
 *
 * Байти не збираються в пам'яті — архів читається потоком, а кожен файл
 * проходить через лічильник рядків у тому ж порядку, у якому лежить у `tar`.
 * Саме тому тут лишається лише «як читати», а «що рахувати» — у
 * `file-filter.ts` і `code-stats.ts`.
 *
 * @module api-dev/src/services/monitoring/code-collector
 */

import type { MetricValue } from "@wwwuabot/shared/monitoring";
import { TarStream } from "./tar";
import { createLineCounter } from "./line-counter";
import { commentStyleFor, isCountedPath } from "./file-filter";
import { toMetricValues, type CountedFile } from "./code-stats";
import { githubHeaders } from "./github";

/** Стеля розпакованого архіву: вище — збір падає, а не рахує половину. */
const MAX_ARCHIVE_BYTES = 96 * 1024 * 1024;

/** Стеля одного файлу: довший за це — не наш код, а зліпок. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Результат колектора: значення плюс те, що варто сказати людині. */
export interface CollectorResult {
  values: MetricValue[];
  note?: string;
}

interface CodeFileState {
  path: string;
  size: number;
  counter: ReturnType<typeof createLineCounter>;
}

/**
 * Прибирає кореневу теку архіву.
 *
 * GitHub загортає вміст у `owner-repo-<sha>/`, тож без цього кроку групи
 * показників називались би `wwwuabot-1a2b3c4d` — і кожен зріз мав би **свої**
 * групи, тобто динаміка не склалась би взагалі.
 */
export function stripArchiveRoot(path: string): string {
  const slash = path.indexOf("/");
  return slash < 0 ? path : path.slice(slash + 1);
}

/**
 * Показники коду на конкретному коміті (або на гілці за замовчуванням, якщо
 * коміт невідомий — GitHub сам її вибере).
 */
export async function collectCode(
  repo: string,
  token: string | undefined,
  ref: string | null,
): Promise<CollectorResult> {
  const url = ref
    ? `https://api.github.com/repos/${repo}/tarball/${encodeURIComponent(ref)}`
    : `https://api.github.com/repos/${repo}/tarball`;
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok || !response.body) {
    throw new Error(`архів ${repo} → HTTP ${response.status}`);
  }

  const files: CountedFile[] = [];
  const state: { current: CodeFileState | null } = { current: null };

  const tar = new TarStream({
    onFile(path, size) {
      const clean = stripArchiveRoot(path);
      if (!isCountedPath(clean) || size > MAX_FILE_BYTES) {
        state.current = null;
        return;
      }
      state.current = { path: clean, size, counter: createLineCounter(commentStyleFor(clean)) };
    },
    onData(chunk) {
      state.current?.counter.push(chunk);
    },
    onFileEnd() {
      const current = state.current;
      if (!current) return;
      const counts = current.counter.counts();
      files.push({
        path: current.path,
        bytes: current.size,
        lines: counts.lines,
        blank: counts.blank,
        comment: counts.comment,
      });
      state.current = null;
    },
  });

  const reader = response.body.pipeThrough(new DecompressionStream("gzip")).getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_ARCHIVE_BYTES) {
      await reader.cancel();
      throw new Error("архів більший за стелю збору");
    }
    tar.push(value);
  }

  return { values: toMetricValues(files), note: `${files.length} файлів ураховано` };
}
