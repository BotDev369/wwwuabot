/**
 * Збір показників репозиторію з GitHub REST API.
 *
 * **П'ять запитів на зріз, і це навмисно.** Кількості (коміти, автори, PR)
 * GitHub не віддає числом — їх рахують сторінками. Але замість обходу всіх
 * сторінок досить **одного** запиту з `per_page=1`: заголовок `Link` містить
 * номер останньої сторінки, а це і є кількість — саме так рахує й сам GitHub.
 *
 * **Спільне число issue — пастка.** `open_issues_count` (і `/issues`) містять
 * **і** pull request'и: показати їх як «issue» означало б показувати суму під
 * іменем одного доданка. Тому PR рахуються окремо й віднімаються.
 *
 * **Без токена це теж працює** — публічне репозиторії читається анонімно, але
 * ліміт 60 запитів на годину **на IP воркера** спільний для всіх. Токен не
 * «зручність», а необхідність для приватного репо й для щоденного розкладу.
 *
 * @module api-dev/src/services/monitoring/github
 */

import { TOTAL_GROUP, type MetricValue } from "@wwwuabot/shared/monitoring";

const API = "https://api.github.com";

/** Заголовки GitHub. `User-Agent` обов'язковий — без нього API відповідає 403. */
export function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "wwwuabot-monitoring",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Номер останньої сторінки із заголовка `Link` — тобто кількість елементів.
 *
 * Для невеликих колекцій GitHub `Link` не віддає зовсім: там остання сторінка
 * і є єдиною, і це видно вже з `null`. Саме тому виклик мусить мати `per_page=1`
 * — інакше «немає Link» означає «менше за сторінку», а не «нуль».
 */
export function parseLastPage(link: string | null): number | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    if (!part.includes('rel="last"')) continue;
    const page = /[?&]page=(\d+)/.exec(part);
    if (page) return Number(page[1]);
  }
  return null;
}

interface GithubResponse<T> {
  status: number;
  link: string | null;
  data: T | null;
}

async function getJson<T>(path: string, token?: string): Promise<GithubResponse<T>> {
  const response = await fetch(`${API}${path}`, { headers: githubHeaders(token) });
  const data = response.ok ? ((await response.json()) as T) : null;
  return { status: response.status, link: response.headers.get("Link"), data };
}

/**
 * Кількість елементів колекції одним запитом.
 *
 * `null` — не «нуль», а «не вдалось»: показник тоді просто не пишеться, і
 * сторінка чесно показує порожньо замість нуля.
 */
async function countPaged(path: string, token?: string): Promise<number | null> {
  const separator = path.includes("?") ? "&" : "?";
  const result = await getJson<unknown[]>(`${path}${separator}per_page=1`, token);
  if (result.status !== 200) return null;
  return parseLastPage(result.link) ?? result.data?.length ?? 0;
}

interface GithubRepo {
  default_branch?: string;
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
  size?: number;
}

interface GithubCommit {
  sha: string;
}

export interface GithubStats {
  readonly values: MetricValue[];
  /** Коміт, на якому знято зріз, — з нього читає й колектор коду. */
  readonly ref: string | null;
  /** Що не вдалось прочитати (для звіту колектора). */
  readonly notes: string[];
}

/**
 * Показники репозиторію: зірки, форки, спостерігачі, issue, PR, коміти, автори.
 *
 * Падає **тільки** якщо недоступний сам репозиторій: часткові невдачі
 * (напр. `contributors` на великому репо може відповісти 202) збираються в
 * `notes` — зріз із частиною показників корисніший за порожній.
 */
export async function fetchRepoStats(repo: string, token?: string): Promise<GithubStats> {
  const values: MetricValue[] = [];
  const notes: string[] = [];
  const push = (metric: string, value: number): void => {
    values.push({ group: TOTAL_GROUP, metric, value });
  };

  const info = await getJson<GithubRepo>(`/repos/${repo}`, token);
  if (info.status !== 200 || !info.data) {
    throw new Error(`GitHub /repos/${repo} → HTTP ${info.status}`);
  }

  push("github.stars", info.data.stargazers_count ?? 0);
  push("github.forks", info.data.forks_count ?? 0);
  push("github.watchers", info.data.subscribers_count ?? 0);
  push("github.repo_size_bytes", (info.data.size ?? 0) * 1024);

  const branch = info.data.default_branch ?? "main";

  const pulls = await countPaged(`/repos/${repo}/pulls?state=open`, token);
  if (pulls === null) notes.push("не вдалось порахувати відкриті PR");
  else push("github.open_pulls", pulls);

  const openAll = await countPaged(`/repos/${repo}/issues?state=open`, token);
  if (openAll === null) notes.push("не вдалось порахувати відкриті issue");
  else push("github.open_issues", Math.max(0, openAll - (pulls ?? 0)));

  const commits = await getJson<GithubCommit[]>(
    `/repos/${repo}/commits?per_page=1&sha=${encodeURIComponent(branch)}`,
    token,
  );
  const ref = commits.data?.[0]?.sha ?? null;
  if (commits.status !== 200) notes.push("не вдалось прочитати коміти");
  else push("github.commits", parseLastPage(commits.link) ?? commits.data?.length ?? 0);

  const contributors = await countPaged(`/repos/${repo}/contributors?anon=1`, token);
  if (contributors === null) notes.push("не вдалось порахувати авторів");
  else push("github.contributors", contributors);

  return { values, ref, notes };
}
