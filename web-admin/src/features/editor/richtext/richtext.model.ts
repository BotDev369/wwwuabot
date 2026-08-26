// Модель форматованого тексту. Ми — єдине джерело, тому все симетрично і без втрат.

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  marked?: boolean;
  url?: string;
}

// ── RichTextUnion → runs ─────────────────────────────────────────────
export function richToRuns(raw: unknown): TextRun[] {
  if (raw === null || raw === undefined) return [];
  if (typeof raw === "string") return raw ? [{ text: raw }] : [];
  if (typeof raw === "number") return [{ text: String(raw) }];
  if (Array.isArray(raw)) return raw.flatMap((r) => richToRuns(r));
  if (typeof raw === "object") {
    const o = raw as { type?: unknown; text?: unknown; url?: unknown };
    const type = typeof o.type === "string" ? o.type : "";
    const url = typeof o.url === "string" ? o.url : undefined;
    return richToRuns(o.text).map((r) => applyEntity(r, type, url));
  }
  return [];
}

function applyEntity(r: TextRun, type: string, url?: string): TextRun {
  const next = { ...r };
  if (type === "bold") next.bold = true;
  else if (type === "italic") next.italic = true;
  else if (type === "underline") next.underline = true;
  else if (type === "strikethrough") next.strikethrough = true;
  else if (type === "marked") next.marked = true;
  else if (type === "url" && url) next.url = url;
  return next;
}

// ── runs → RichTextUnion ─────────────────────────────────────────────
export function runsToRich(runs: TextRun[]): unknown {
  const clean = runs.filter((r) => r.text);
  if (clean.length === 0) return "";
  if (clean.length === 1) return runToNode(clean[0]);
  return clean.map(runToNode);
}

function runToNode(run: TextRun): unknown {
  let node: unknown = run.text;
  if (run.url) node = { type: "url", text: node, url: run.url };
  if (run.marked) node = { type: "marked", text: node };
  if (run.strikethrough) node = { type: "strikethrough", text: node };
  if (run.underline) node = { type: "underline", text: node };
  if (run.italic) node = { type: "italic", text: node };
  if (run.bold) node = { type: "bold", text: node };
  return node;
}

// ── runs ↔ markup ────────────────────────────────────────────────────
export function runsToMarkup(runs: TextRun[]): string {
  return runs.map(runToMarkup).join("");
}

function runToMarkup(run: TextRun): string {
  let s = run.text;
  if (run.url) s = `[${s}](${run.url})`;
  if (run.marked) s = `||${s}||`;
  if (run.strikethrough) s = `~~${s}~~`;
  if (run.underline) s = `__${s}__`;
  if (run.italic) s = `*${s}*`;
  if (run.bold) s = `**${s}**`;
  return s;
}

export function markupToRuns(markup: string): TextRun[] {
  return mergeRuns(parseSeq(markup, { i: 0 }, null));
}

function parseSeq(src: string, cur: { i: number }, closer: string | null): TextRun[] {
  const out: TextRun[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      out.push({ text: buf });
      buf = "";
    }
  };
  while (cur.i < src.length) {
    if (closer && src.startsWith(closer, cur.i)) {
      cur.i += closer.length;
      flush();
      return out;
    }
    if (src.startsWith("**", cur.i)) {
      cur.i += 2;
      out.push(...addStyle(parseSeq(src, cur, "**"), { bold: true }));
      continue;
    }
    if (src.startsWith("__", cur.i)) {
      cur.i += 2;
      out.push(...addStyle(parseSeq(src, cur, "__"), { underline: true }));
      continue;
    }
    if (src.startsWith("~~", cur.i)) {
      cur.i += 2;
      out.push(...addStyle(parseSeq(src, cur, "~~"), { strikethrough: true }));
      continue;
    }
    if (src.startsWith("||", cur.i)) {
      cur.i += 2;
      out.push(...addStyle(parseSeq(src, cur, "||"), { marked: true }));
      continue;
    }
    if (src.startsWith("*", cur.i)) {
      cur.i += 1;
      out.push(...addStyle(parseSeq(src, cur, "*"), { italic: true }));
      continue;
    }
    if (src.startsWith("[", cur.i)) {
      cur.i += 1;
      const inner = parseSeq(src, cur, "]");
      if (src.startsWith("(", cur.i)) {
        cur.i += 1;
        const start = cur.i;
        while (cur.i < src.length && src[cur.i] !== ")") cur.i++;
        const url = src.slice(start, cur.i);
        if (src[cur.i] === ")") cur.i++;
        out.push(...addStyle(inner, { url }));
      } else {
        out.push({ text: "[" }, ...inner);
      }
      continue;
    }
    buf += src[cur.i];
    cur.i++;
  }
  flush();
  return out;
}

function addStyle(runs: TextRun[], style: Partial<TextRun>): TextRun[] {
  return runs.map((r) => ({ ...r, ...style }));
}

function sameStyle(a: TextRun, b: TextRun): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.marked === b.marked &&
    a.url === b.url
  );
}

export function mergeRuns(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last, r)) last.text += r.text;
    else out.push({ ...r });
  }
  return out;
}
