/**
 * Каталог дослідження в платформі: `GET /api/public/research`.
 *
 * @module web-platform-dev/src/shared/api/research.api
 */

import type { ResearchCatalog } from "@wwwuabot/shared/research";
import { apiFetch } from "./client";

const PATH = "/api/public/research";

/** Конверт відповіді — те саме, що віддає `api-dev`. */
interface Envelope {
  ok: boolean;
  error?: string;
  catalog?: ResearchCatalog | null;
}

export const researchApi = {
  /** Каталог — або `null`, коли дослідження ще не засіяне. */
  catalog: async (): Promise<ResearchCatalog | null> => {
    const envelope = await apiFetch<Envelope>(PATH);
    return envelope.catalog ?? null;
  },
};
