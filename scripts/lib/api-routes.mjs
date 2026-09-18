/**
 * Інвентар ендпоїнтів `api-dev` — **з коду**, а не з голови.
 *
 * Реєстр, написаний руками, бреше першим: ендпоїнт додали, список не оновили, і
 * документ читається як «цього шляху немає». Тому список збирається з
 * `api-dev/src/router.ts`, а `check:docs` падає, якщо згенерований файл
 * розійшовся з кодом.
 *
 * Групи доступу — тут, і це **єдина** таблиця: `AGENTS.md` §5 описує три групи
 * словами, а шлях без групи (новий префікс) зупиняє гейт і змушує її додати.
 * Причина в тому, що адмін-гейт визначають саме префікси: незареєстрований шлях
 * пройшов би повз нього мовчки.
 *
 * @module scripts/lib/api-routes
 */

import { read } from "./files.mjs";

const ROUTER = "api-dev/src/router.ts";

/** Файл, у який виливається інвентар. */
export const API_DOC = "docs/API.md";

/** Групи доступу: порядок — від публічного до найдорожчого. */
const GROUPS = [
  {
    title: "Публічне",
    auth: "без авторизації",
    prefixes: ["/health", "/api/scenario/", "/api/mydate/"],
  },
  {
    title: "Користувач",
    auth: "підписаний Telegram `initData`",
    prefixes: ["/api/my-dates", "/api/notes", "/api/contacts", "/api/user/"],
  },
  {
    title: "Адмін",
    auth: "cookie `admin_session`",
    prefixes: ["/api/admin/", "/api/portal/", "/api/bot/"],
  },
  {
    title: "Сесія адміна",
    auth: "ставить або знімає cookie",
    prefixes: ["/auth/"],
  },
];

/**
 * Розбирає роутер.
 *
 * Форма запису в ньому навмисно однакова (`if (pathname === "…")` /
 * `if (pathname.startsWith("…"))`, далі `return handle…`), тож розбір чесний:
 * рядок, якого він не впізнає, просто не потрапляє в список — і гейт це показує
 * як «шлях без групи», а не як мовчазну прогалину.
 */
export function apiRoutes() {
  const lines = read(ROUTER).split("\n");
  const routes = [];

  lines.forEach((line, index) => {
    const method = /request\.method === "([A-Z]+)"/.exec(line)?.[1] ?? "ANY";

    // Один рядок може нести два точні шляхи (`/health` і `/health/`) — беру обидва.
    const exact = [...line.matchAll(/pathname === "([^"]+)"/g)].map((m) => m[1]);
    const prefixed = /pathname\.startsWith\("([^"]+)"\)/.exec(line)?.[1];
    if (exact.length === 0 && !prefixed) return;

    // Обробник — у наступних рядках: тіло `if` коротке, але трапляються перевірки
    // (`if (date === null) return badRequest();`), тому шукаємо саме `handle…`.
    let handler = "—";
    for (let i = index; i < Math.min(index + 6, lines.length); i++) {
      const call = /return (handle\w+)\(/.exec(lines[i]);
      if (call) {
        handler = call[1];
        break;
      }
    }

    const found = prefixed ? [`${prefixed}<…>`] : exact;
    for (const raw of found) {
      // `/health/` — те саме, що `/health`: тримаємо один рядок у списку.
      const path = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
      if (routes.some((route) => route.path === path)) continue;
      routes.push({ method, path, handler, group: groupOf(path), line: index + 1 });
    }
  });

  const unclassified = routes.filter((route) => route.group === null);
  if (unclassified.length) {
    throw new Error(
      "Шляхи без групи доступу (додай префікс у GROUPS у scripts/lib/api-routes.mjs):\n" +
        unclassified.map((r) => `  ${r.path} — ${ROUTER}:${r.line}`).join("\n"),
    );
  }

  routes.sort(
    (a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.path.localeCompare(b.path),
  );
  return routes;
}

function groupOf(path) {
  let found = null;
  for (const group of GROUPS) {
    for (const prefix of group.prefixes) {
      if (path.startsWith(prefix) && (!found || prefix.length > found.prefixLength)) {
        found = { group, prefixLength: prefix.length };
      }
    }
  }
  return found?.group ?? null;
}

/** Markdown-інвентар: те, що лежить у `docs/API.md`. */
export function renderApiDoc() {
  const routes = apiRoutes();
  const byGroup = GROUPS.map((group) => ({
    group,
    routes: routes.filter((route) => route.group === group),
  })).filter((entry) => entry.routes.length > 0);

  const out = [
    "# Ендпоїнти API",
    "",
    "> **Згенеровано** — не правити руками: `npm run doc:api` (`scripts/doc-api.mjs`) читає",
    "> `" + ROUTER + "`. Гейт `check:docs` падає, якщо цей файл розійшовся з кодом, тож",
    "> список застаріти не може.",
    "",
    "Кожен шлях належить рівно одній групі доступу, і це визначають **префікси**, а не",
    "сам ендпоїнт: адмінські шляхи мусять бути під `/api/admin/`, `/api/portal/` або",
    "`/api/bot/`, інакше вони проходять повз єдиний адмін-гейт (`AGENTS.md` §5, §7).",
    "Рецепт нового ендпоїнта — `docs/RECIPES.md`.",
    "",
  ];

  for (const { group, routes: groupRoutes } of byGroup) {
    out.push(`## ${group.title} — ${group.auth}`, "");
    out.push("| Метод | Шлях | Обробник |");
    out.push("|---|---|---|");
    for (const route of groupRoutes) {
      out.push(`| \`${route.method}\` | \`${route.path}\` | \`${route.handler}\` |`);
    }
    out.push("");
  }

  out.push(`Усього шляхів: **${routes.length}**.`, "");
  return out.join("\n");
}
