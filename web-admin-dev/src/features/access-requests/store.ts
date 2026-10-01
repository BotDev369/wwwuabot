/**
 * Стан екрана «Повідомлення» — список звернень і дії над ними.
 *
 * **Джерело правди — сервер.** Після створення й правки ми перечитуємо список,
 * а не підставляємо те, що надіслали: сервер обрізає текст по межі, тож «як я
 * надіслав» і «що лежить у базі» — це різні речі, а показувати другу означало б
 * показувати те, чого немає. Видалення — єдина дія, що робиться на місці: рядку
 * більше не існує, тож перечитувати список заради нього не потрібно.
 *
 * @module web-admin-dev/src/features/access-requests/store
 */

import { create } from "zustand";
import type { AccessRequestItem } from "@wwwuabot/shared/access-requests";
import {
  listAccessRequests,
  createAccessRequest,
  updateAccessRequest,
  deleteAccessRequest,
} from "../../shared/api/access-requests.api";

export type AccessRequestsStatus = "idle" | "loading" | "error";

interface AccessRequestsStore {
  items: AccessRequestItem[];
  status: AccessRequestsStatus;
  errorMsg: string | null;
  /** Пошук за іменем, підписом і текстом — фільтр на клієнті, як у «Користувачах». */
  search: string;
  load: () => Promise<void>;
  setSearch: (query: string) => void;
  create: (userId: number, text: string) => Promise<void>;
  update: (id: number, text: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useAccessRequests = create<AccessRequestsStore>((set) => ({
  items: [],
  status: "idle",
  errorMsg: null,
  search: "",

  load: async () => {
    set({ status: "loading", errorMsg: null });
    try {
      set({ items: await listAccessRequests(), status: "idle" });
    } catch (e: unknown) {
      set({ status: "error", errorMsg: (e as Error).message });
    }
  },

  setSearch: (query) => set({ search: query }),

  create: async (userId, text) => {
    await createAccessRequest(userId, text);
    await useAccessRequests.getState().load();
  },

  update: async (id, text) => {
    await updateAccessRequest(id, text);
    await useAccessRequests.getState().load();
  },

  remove: async (id) => {
    await deleteAccessRequest(id);
    set((state) => ({ items: state.items.filter((row) => row.id !== id) }));
  },
}));
