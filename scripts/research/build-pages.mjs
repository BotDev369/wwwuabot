/**
 * Контент дослідження → рядки `scenarios` і каталог для KV.
 *
 * Джерело — markdown у `content/viruvannia/`: заголовок → `text`, абзац →
 * `text`, таблиця → `table`, список → `list`. Запуск:
 * `node scripts/research/build-pages.mjs`.
 *
 * @module scripts/research/build-pages
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "content/viruvannia";
const BLOCKS = join(ROOT, "blocks");
const LANDING_SLUG = "viruvannia";
const MODULE = "viruvannia";
const MIGRATION = "scripts/migrations/2026-10-30-scenarios-04-research.sql";
const CATALOG = join(ROOT, "catalog.json");

/* ── Фронтматер ───────────────────────────────────────────────────── */

function unquote(raw) {
  const text = raw.trim();
  if (/^".*"$/.test(text) || /^'.*'$/.test(text)) return text.slice(1, -1);
  return text;
}

function splitFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
  if (!match) return { head: "", body: source };
  return { head: match[1], body: match[2] };
}

/**
 * Мінімальний YAML: скаляри, `>` (згорнутий текст), списки `- ключ: значення`
 * і `[a, b]`. Повноцінний парсер тут зайвий — формат задає пакет, а не користувач.
 */
function parseFrontmatter(head) {
  const data = {};
  const lines = head.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) {
      index += 1;
      continue;
    }

    const [, key, rest] = pair;
    index += 1;

    if (rest === ">" || rest === "|") {
      const parts = [];
      while (index < lines.length && (/^\s+\S/.test(lines[index]) || lines[index] === "")) {
        parts.push(lines[index].trim());
        index += 1;
      }
      data[key] = parts.filter(Boolean).join(" ");
      continue;
    }

    if (rest === "") {
      const items = [];
      let current = null;
      while (index < lines.length && (/^\s+/.test(lines[index]) || lines[index] === "")) {
        const raw = lines[index].trim();
        index += 1;
        if (!raw) continue;
        const item = /^-\s+([A-Za-z][\w-]*):\s*(.*)$/.exec(raw);
        if (item) {
          current = { [item[1]]: unquote(item[2]) };
          items.push(current);
          continue;
        }
        const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(raw);
        if (field && current) current[field[1]] = unquote(field[2]);
      }
      data[key] = items;
      continue;
    }

    if (rest.startsWith("[")) {
      data[key] = rest
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .split(",")
        .map((item) => unquote(item))
        .filter(Boolean);
      continue;
    }

    data[key] = unquote(rest);
  }

  return data;
}

/* ── Markdown → блоки ─────────────────────────────────────────────── */

const isTableRow = (line) => /^\|.*\|\s*$/.test(line);
const isTableRule = (line) => /^\|[\s:|-]+\|\s*$/.test(line);

function cellsOf(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function inlineText(raw) {
  return raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Тіло блоку → масив блоків Page Builder, у тому порядку, що в тексті. */
function bodyToBlocks(body, prefix) {
  const blocks = [];
  const lines = body.split("\n");
  let index = 0;
  let order = 0;

  const push = (type, props) => {
    blocks.push({ id: `${prefix}-${order}`, type, order, props });
    order += 1;
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Заголовок першого рівня — це назва сторінки (`scenarios.title`), не блок.
    if (/^#\s+/.test(line)) {
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      push("text", { title: inlineText(line.replace(/^##\s+/, "")), level: "h2" });
      index += 1;
      continue;
    }

    if (isTableRow(line) && isTableRule(lines[index + 1] ?? "")) {
      const headers = cellsOf(line).map(inlineText);
      index += 2;
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(cellsOf(lines[index]).map(inlineText));
        index += 1;
      }
      const width = Math.max(headers.length, ...rows.map((row) => row.length));
      const padded = (row) => [...row, ...Array(width - row.length).fill("")];
      push("table", { headers: padded(headers), rows: rows.map(padded), striped: true });
      continue;
    }

    if (/^([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items = [];
      while (index < lines.length && /^([-*]|\d+\.)\s+/.test(lines[index])) {
        items.push({ text: inlineText(lines[index].replace(/^([-*]|\d+\.)\s+/, "")) });
        index += 1;
      }
      push("list", { items, ordered });
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const next = lines[index];
      if (!next.trim()) break;
      if (/^#{2,}\s+/.test(next) || /^([-*]|\d+\.)\s+/.test(next)) break;
      if (isTableRow(next)) break;
      paragraph.push(next.replace(/^>\s?/, ""));
      index += 1;
    }
    const text = inlineText(paragraph.join(" "));
    if (text) push("text", { content: text });
  }

  return blocks;
}

/* ── Сторінки ─────────────────────────────────────────────────────── */

function detailPage(block) {
  const meta = [
    `Дані: ${block.dataDate}`,
    `Опубліковано: ${block.publishedDate}`,
    `Статус: ${block.dataStatus}`,
    `${block.readingTime} хв`,
  ].join(" · ");

  const header = [
    {
      id: `res-${block.id}-h1`,
      type: "text",
      order: 0,
      props: { title: block.title, level: "h1" },
    },
    {
      id: `res-${block.id}-lead`,
      type: "text",
      order: 1,
      props: { content: block.oneLiner },
    },
    { id: `res-${block.id}-meta`, type: "text", order: 2, props: { content: meta } },
    { id: `res-${block.id}-hr`, type: "divider", order: 3, props: {} },
  ];

  const figures = block.keyFigures.map((figure, i) => ({
    id: `res-${block.id}-fig${i}`,
    type: "stat",
    order: i,
    props: { value: figure.value, label: figure.label },
  }));

  const main = [...figures, ...bodyToBlocks(block.body, `res-${block.id}-m`)];

  const footer = [
    {
      id: `res-${block.id}-src`,
      type: "text",
      order: 0,
      props: { title: "Джерела", level: "h3" },
    },
    {
      id: `res-${block.id}-srclist`,
      type: "list",
      order: 1,
      props: {
        ordered: true,
        items: block.sources.map((source) => ({
          text: `${source.name} — ${source.title}`,
          description: `${source.year}${source.url ? ` · ${source.url}` : ""}`,
        })),
      },
    },
    {
      id: `res-${block.id}-back`,
      type: "link-button",
      order: 2,
      props: { text: "Усі блоки дослідження", url: `/${LANDING_SLUG}`, icon: "arrow-left" },
    },
    {
      id: `res-${block.id}-note`,
      type: "text",
      order: 3,
      props: {
        content:
          "Це дослідження, а не оцінка істинності релігій: ми описуємо, як люди вірять, скільки їх і на чому це ґрунтується.",
      },
    },
  ];

  return {
    version: 1,
    visibleZones: ["header", "main", "footer"],
    zones: { sidebar: [], header, main, footer },
  };
}

function landingPage(blocks) {
  const groups = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (last && last.title === block.groupTitle) last.items.push(block);
    else groups.push({ title: block.groupTitle, items: [block] });
  }

  const header = [
    {
      id: "res-home-hero",
      type: "hero",
      order: 0,
      props: {
        title: "У що вірить людство",
        subtitle:
          "Розподіл 100% населення планети за віруваннями й невіруваннями: дані Pew Research Center і World Religion Database, кожен блок зі своїм джерелом.",
        align: "center",
      },
    },
    {
      id: "res-home-how",
      type: "text",
      order: 1,
      props: {
        title: "Як читати цю сторінку",
        level: "h2",
        content:
          "Кожен блок — окреме дослідження зі своєю датою й джерелом. Відсотки завжди в межах 100% і завжди з позначенням методології. «Нерелігійний» не означає «атеїст», а «християнин у переписі» — не означає «практикуючий».",
      },
    },
  ];

  const main = [];
  let order = 0;
  for (const group of groups) {
    main.push({
      id: `res-home-group-${group.title.replace(/\s+/g, "-").toLowerCase()}`,
      type: "text",
      order: order++,
      props: { title: group.title, level: "h2" },
    });
    main.push({
      id: `res-home-links-${group.title.replace(/\s+/g, "-").toLowerCase()}`,
      type: "buttons",
      order: order++,
      props: {
        layout: "column",
        items: group.items.map((block) => ({
          text: `${block.title} — ${block.oneLiner}`,
          url: `/${MODULE}-${block.id}`,
          variant: "secondary",
        })),
      },
    });
  }

  const footer = [
    { id: "res-home-hr", type: "divider", order: 0, props: {} },
    {
      id: "res-home-method",
      type: "text",
      order: 1,
      props: {
        title: "Звідки цифри",
        level: "h3",
        content:
          "Основний шар — Pew Research Center (публікація 09.06.2025, база 2020, 201 країна, самоідентифікація). Альтернативний — World Religion Database 2025 (Brill, «адепти» за практикою). Шари не змішуються в межах однієї таблиці.",
      },
    },
    {
      id: "res-home-note",
      type: "text",
      order: 2,
      props: {
        content:
          "Ми не оцінюємо істинність релігій і не агітуємо за віру або атеїзм. Число без джерела й року — не дані, а думка.",
      },
    },
  ];

  return {
    version: 1,
    visibleZones: ["header", "main", "footer"],
    zones: { sidebar: [], header, main, footer },
  };
}

/* ── Читання пакета ───────────────────────────────────────────────── */

function readBlocks() {
  const files = readdirSync(BLOCKS)
    .filter((name) => name.endsWith(".md"))
    .sort();

  return files.map((file) => {
    const source = readFileSync(join(BLOCKS, file), "utf8");
    const { head, body } = splitFrontmatter(source);
    const meta = parseFrontmatter(head);
    return {
      ...meta,
      body,
      year: meta.year,
      sources: (meta.sources ?? []).map((source) => ({
        name: source.name ?? "",
        title: source.title ?? "",
        year: source.year ?? "",
        url: source.url ?? "",
      })),
      keyFigures: meta.keyFigures ?? [],
    };
  });
}

/* ── SQL ──────────────────────────────────────────────────────────── */

function sqlText(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertRow({ slug, title, pageData, photoUrl = null }) {
  const page = JSON.stringify(pageData, null, 2);
  return `INSERT INTO scenarios (slug, title, photo_url, page_data, is_active, is_public, updated_at)
VALUES (${sqlText(slug)}, ${sqlText(title)}, ${sqlText(photoUrl)}, ${sqlText(page)}, 1, 1, datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  page_data = excluded.page_data,
  is_active = 1,
  is_public = 1,
  updated_at = datetime('now');`;
}

function buildSql(rows) {
  return `-- Дослідження «У що вірить людство»: лендінг і 12 блоків MVP.
--
-- Згенеровано з \`content/viruvannia/blocks/*.md\` скриптом
-- \`scripts/research/build-pages.mjs\` — правити треба markdown, а не цей файл.
--
-- Рядок = сторінка вебу (\`page_data\`), як у будь-якого контенту платформи.
-- \`is_public = 1\` ставить лендінг у «Публічні сторінки»; \`owner_id\` лишається
-- порожнім, бо це редакційний контент, а не сторінка людини.
-- Повторний запуск ідемпотентний: ON CONFLICT перезаписує ту саму адресу.

${rows.map((row) => insertRow(row)).join("\n\n")}
`;
}

/* ── Запуск ───────────────────────────────────────────────────────── */

const blockList = readBlocks();

if (blockList.length === 0) {
  throw new Error("Немає жодного блоку в content/viruvannia/blocks — нема що збирати");
}

const unknownStatus = blockList.filter((block) => !block.id || !block.title);
if (unknownStatus.length > 0) {
  throw new Error(`Блок без id або title: ${unknownStatus.map((b) => b.slug).join(", ")}`);
}

const rows = [
  { slug: LANDING_SLUG, title: "У що вірить людство", pageData: landingPage(blockList) },
  ...blockList.map((block) => ({
    slug: `${MODULE}-${block.id}`,
    title: block.title,
    pageData: detailPage(block),
  })),
];

const catalog = {
  title: "У що вірить людство",
  slug: LANDING_SLUG,
  updatedAt: new Date().toISOString().slice(0, 10),
  blocks: blockList.map((block) => ({
    id: block.id,
    slug: `${MODULE}-${block.id}`,
    group: block.group,
    groupTitle: block.groupTitle,
    title: block.title,
    oneLiner: block.oneLiner,
    dataDate: block.dataDate,
    publishedDate: block.publishedDate,
    dataStatus: block.dataStatus,
    readingTime: Number(block.readingTime),
    keyFigures: block.keyFigures,
  })),
};

writeFileSync(MIGRATION, buildSql(rows));
writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`сторінок: ${rows.length} (лендінг + ${blockList.length})`);
console.log(`блоків у каталозі: ${catalog.blocks.length}`);
console.log(`SQL: ${MIGRATION}`);
console.log(`каталог: ${CATALOG}`);
