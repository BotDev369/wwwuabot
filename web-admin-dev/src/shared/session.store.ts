/**
 * Чий вхід відкрито в цій вкладці: заповнює `AuthGate` після `/auth/check`.
 * Це не захист (його тримає сервер), а чесний інтерфейс — Buffy бачить лише
 * «Стіл», бо пункт, який усе одно відповість 401, не має бути видно.
 *
 * @module web-admin-dev/src/shared/session.store
 */

import { create } from "zustand";
import type { SessionSide } from "./api/auth.api";

interface SessionState {
  side: SessionSide | null;
  setSide: (side: SessionSide | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  side: null,
  setSide: (side) => set({ side }),
}));
