import { create } from "zustand";
import { blockRegistry } from "./blocks/registry";
import type { BaseBlock } from "./blocks/types";
import { readScenario, writeScenario } from "../../shared/api/scenarios.api";
import "./blocks/unknown";
import "./blocks/table";
import "./blocks/footer";
import "./blocks/blockquote";
import "./blocks/list";
import "./blocks/details";
import "./blocks/photo";

// Імпортуємо модулі блоків, щоб вони зареєстрували себе в Реєстрі
import "./blocks/heading";
import "./blocks/paragraph";
import "./blocks/divider";

export type EditorStatus = "idle" | "loading" | "saving" | "saved" | "error";

export interface EditorStore {
  codeword: string;
  /** Тип таблиці: "admin" = scenarios-admin, "portal" = scenarios */
  table: "admin" | "portal";
  blocks: BaseBlock[]; // ← УНІВЕРСАЛЬНИЙ ТИП
  status: EditorStatus;
  errorMsg: string | null;
  isDirty: boolean;

  setCodeword: (cw: string) => void;
  setTable: (table: "admin" | "portal") => void;
  addBlock: (type: string) => void; // ← Приймає просто рядок (тип)
  removeBlock: (id: string) => void;
  updateBlock: (id: string, patch: Partial<Record<string, any>>) => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  load: () => Promise<void>;
  save: () => Promise<void>;

  _setBlocks: (blocks: BaseBlock[]) => void;
  _setStatus: (status: EditorStatus, msg?: string | null) => void;
}

let _idCounter = 0;
function genId(): string {
  return `block_${Date.now()}_${++_idCounter}`;
}

// ─── Рекурсивні операції над деревом блоків (включно з children) ─────────────
function mapDeep(blocks: BaseBlock[], id: string, fn: (b: BaseBlock) => BaseBlock): BaseBlock[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    const kids = (b as any).children;
    if (Array.isArray(kids)) return { ...b, children: mapDeep(kids, id, fn) };
    return b;
  });
}

function removeDeep(blocks: BaseBlock[], id: string): BaseBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => {
      const kids = (b as any).children;
      if (Array.isArray(kids)) return { ...b, children: removeDeep(kids, id) };
      return b;
    });
}

function moveDeep(blocks: BaseBlock[], id: string, dir: "up" | "down"): BaseBlock[] {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= blocks.length) return blocks;
    const next = [...blocks];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    return next;
  }
  return blocks.map((b) => {
    const kids = (b as any).children;
    if (Array.isArray(kids)) return { ...b, children: moveDeep(kids, id, dir) };
    return b;
  });
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  codeword: "",
  table: "admin" as "admin" | "portal",
  blocks: [],
  status: "idle",
  errorMsg: null,
  isDirty: false,

  setCodeword: (cw) => set({ codeword: cw }),
  setTable: (table) => set({ table }),

  addBlock: (type) => {
    const config = blockRegistry.getByInternalType(type);
    if (!config) {
      console.error(`[Store] Unknown block type: ${type}`);
      return;
    }
    const id = genId();
    const newBlock = config.createDefault(id);
    set((s) => ({ blocks: [...s.blocks, newBlock], isDirty: true }));
  },

  removeBlock: (id) => set((s) => ({ blocks: removeDeep(s.blocks, id), isDirty: true })),

  updateBlock: (id, patch) =>
    set((s) => ({
      blocks: mapDeep(s.blocks, id, (b) => ({ ...b, ...patch })),
      isDirty: true,
    })),

  moveBlock: (id, direction) =>
    set((s) => ({ blocks: moveDeep(s.blocks, id, direction), isDirty: true })),

  load: async () => {
    const { codeword, _setStatus, _setBlocks } = get();
    const cw = codeword.trim();
    if (!cw) return;
    _setStatus("loading");
    try {
      const data = await readScenario(cw, get().table);

      if (!data) {
        _setStatus("error", `Сценарій "${cw}" не знайдено в базі.`);
        _setBlocks([]);
        return;
      }

      if (!data.rich_data || data.rich_data.trim() === "") {
        _setStatus("idle");
        _setBlocks([]);
        return;
      }

      // Парсимо JSON і віддаємо Реєстру для десеріалізації
      let tgBlocks: any[] = [];
      try {
        tgBlocks = JSON.parse(data.rich_data);
      } catch {
        tgBlocks = [];
      }
      if (!Array.isArray(tgBlocks)) tgBlocks = [];

      _setBlocks(blockRegistry.deserialize(tgBlocks));
      _setStatus("idle");
    } catch (e) {
      _setStatus("error", (e as Error).message);
    }
  },

  save: async () => {
    const { codeword, blocks, _setStatus } = get();
    const cw = codeword.trim();
    if (!cw) return;
    _setStatus("saving");
    try {
      // Віддаємо масив Реєстру для серіалізації в формат Telegram
      const serializedBlocks = blockRegistry.serialize(blocks);
      const richData = JSON.stringify(serializedBlocks, null, 2);

      await writeScenario(cw, richData, true, get().table);

      _setStatus("saved");
      set({ isDirty: false });
      setTimeout(() => {
        if (get().status === "saved") set({ status: "idle" });
      }, 2000);
    } catch (e) {
      _setStatus("error", (e as Error).message);
    }
  },

  _setBlocks: (blocks) => set({ blocks, isDirty: false }),
  _setStatus: (status, msg) => set({ status, errorMsg: msg ?? null }),
}));
