/**
 * Тести потокового читача `tar`.
 *
 * Архів збирається **в тесті**, а не береться з мережі: розбір мусить
 * перевірятись на власних даних, де кожен байт відомий. Шматки подаються
 * розміром 7 байтів — так межі заголовків і відступів припадають на середину
 * шматка, і саме там ламаються потокові парсери.
 *
 * @module api-dev/src/services/monitoring/tar.test
 */

import { describe, expect, it } from "vitest";
import { TarStream } from "./tar";
import { headerPath, numericField } from "./tar-header";

const BLOCK = 512;

function put(target: Uint8Array, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) target[offset + i] = value.charCodeAt(i);
}

function header(path: string, size: number, type = "0", prefix = ""): Uint8Array {
  const block = new Uint8Array(BLOCK);
  put(block, 0, path);
  put(block, 100, "0000644\u0000");
  put(block, 108, "0000000\u0000");
  put(block, 116, "0000000\u0000");
  put(block, 124, `${size.toString(8).padStart(11, "0")}\u0000`);
  put(block, 136, "00000000000\u0000");
  put(block, 148, "        ");
  block[156] = type.charCodeAt(0);
  put(block, 257, "ustar\u0000");
  if (prefix) put(block, 345, prefix);
  return block;
}

interface Entry {
  path: string;
  content?: string;
  type?: string;
  /** Скільки байтів оголосити в заголовку (для PAX-запису — довжина вмісту). */
  declaredSize?: number;
}

function archive(entries: Entry[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  for (const entry of entries) {
    const data = encoder.encode(entry.content ?? "");
    parts.push(header(entry.path, entry.declaredSize ?? data.length, entry.type));
    if (data.length > 0) {
      parts.push(data);
      const rest = data.length % BLOCK;
      if (rest) parts.push(new Uint8Array(BLOCK - rest));
    }
  }
  parts.push(new Uint8Array(BLOCK * 2));

  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

interface ReadFile {
  size: number;
  text: string;
}

/** Читає архів шматками й повертає файли так, як їх побачив обробник. */
function read(archiveBytes: Uint8Array, chunkSize = 7): Map<string, ReadFile> {
  const files = new Map<string, ReadFile>();
  const state: { current: { path: string; size: number; parts: number[] } | null } = {
    current: null,
  };

  const tar = new TarStream({
    onFile(path, size) {
      state.current = { path, size, parts: [] };
    },
    onData(chunk) {
      for (const byte of chunk) state.current?.parts.push(byte);
    },
    onFileEnd(path, size) {
      const current = state.current;
      if (!current) return;
      files.set(path, { size, text: new TextDecoder().decode(Uint8Array.from(current.parts)) });
      state.current = null;
    },
  });

  for (let i = 0; i < archiveBytes.length; i += chunkSize) {
    tar.push(archiveBytes.subarray(i, i + chunkSize));
  }
  return files;
}

describe("TarStream", () => {
  it("читає вміст і розміри файлів шматками по 7 байтів", () => {
    const files = read(
      archive([
        { path: "repo-abc/api-dev/src/index.ts", content: "export const a = 1;\n" },
        { path: "repo-abc/README.md", content: "# wwwuabot\n" },
      ]),
    );

    expect([...files.keys()]).toEqual(["repo-abc/api-dev/src/index.ts", "repo-abc/README.md"]);
    expect(files.get("repo-abc/api-dev/src/index.ts")).toEqual({
      size: 20,
      text: "export const a = 1;\n",
    });
    expect(files.get("repo-abc/README.md")?.text).toBe("# wwwuabot\n");
  });

  it("враховує відступ після файлу, довшого за 512 байтів", () => {
    const big = "x".repeat(600);
    const files = read(
      archive([
        { path: "big.txt", content: big },
        { path: "small.txt", content: "ok" },
      ]),
    );

    expect(files.get("big.txt")?.text).toHaveLength(600);
    expect(files.get("small.txt")?.text).toBe("ok");
  });

  it("не віддає теки як файли, але не збивається на наступному", () => {
    const files = read(
      archive([
        { path: "repo-abc/", type: "5" },
        { path: "repo-abc/keep.ts", content: "1" },
      ]),
    );

    expect([...files.keys()]).toEqual(["repo-abc/keep.ts"]);
  });

  it("бере довге ім'я з PAX-заголовка", () => {
    const long = "repo-abc/docs/" + "a".repeat(120) + ".md";
    const record = `path=${long}`;
    const paxBody = `${record.length + 3} ${record}\n`;

    const files = read(
      archive([
        { path: "PaxHeaders/long", content: paxBody, type: "x" },
        { path: "truncated-name", content: "body" },
      ]),
    );

    expect([...files.keys()]).toEqual([long]);
    expect(files.get(long)?.text).toBe("body");
  });

  it("зупиняється на нульових блоках і не читає сміття далі", () => {
    const trailing = new Uint8Array(BLOCK);
    put(trailing, 0, "unexpected.txt");
    put(trailing, 124, "00000000004\u0000");

    const combined = new Uint8Array(archive([{ path: "first.txt", content: "a" }]).length + BLOCK);
    combined.set(archive([{ path: "first.txt", content: "a" }]), 0);
    combined.set(trailing, combined.length - BLOCK);

    expect([...read(combined).keys()]).toEqual(["first.txt"]);
  });

  it("порожній файл теж подія (розмір нуль, вмісту немає)", () => {
    const files = read(
      archive([
        { path: "empty.txt", content: "" },
        { path: "next.txt", content: "n" },
      ]),
    );

    expect(files.get("empty.txt")).toEqual({ size: 0, text: "" });
    expect(files.get("next.txt")?.text).toBe("n");
  });
});

describe("заголовок", () => {
  it("складає ім'я з prefix (ustar)", () => {
    expect(headerPath(header("router.ts", 0, "0", "repo/api-dev/src"))).toBe(
      "repo/api-dev/src/router.ts",
    );
  });

  it("читає вісімковий розмір", () => {
    expect(numericField(header("a", 4096), 124, 12)).toBe(4096);
  });

  it("читає base-256 розмір (він не влізає у вісімкове поле)", () => {
    // Поле читається цілком: 0x80 — маркер base-256, далі 11 байтів великого
    // кінця. Саме так `tar` записує розміри понад 8 ГБ.
    const field = new Uint8Array(12);
    field[0] = 0x80;
    field[10] = 0x01;
    expect(numericField(field, 0, 12)).toBe(256);
  });
});
