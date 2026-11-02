/**
 * Версія вигляду: чи змінився CSS відтоді, як сторінку відкривали востаннє.
 *
 * Версію дає каталог (`npm run doc:style`) — це відбиток усіх CSS-файлів, а не
 * дата й не обіцянка. Побачене лежить у памʼяті пристрою, тож сторінка каже
 * «оновлено» лише тоді, коли справді є що дивитись.
 * @module web-admin-dev/src/pages/style/useStyleVersion
 */

import { useEffect, useState } from "react";
import catalogUrl from "@wwwuabot/shared/styles/catalog.json?url";

const SEEN_KEY = "wwwuabot-style-seen";

interface Seen {
  version: string;
  at: string;
}

export interface StyleVersion {
  status: "loading" | "error" | "ready";
  version: string;
  /** Версія, яку бачили минулого разу; порожньо — ще не бачили. */
  previous: string;
  updated: boolean;
  /** Коли дивились минулого разу, словами; порожньо — не дивились. */
  seenAt: string;
  markSeen: () => void;
}

function readSeen(): Seen | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Seen>;
    if (typeof parsed.version !== "string" || typeof parsed.at !== "string") return null;
    return { version: parsed.version, at: parsed.at };
  } catch {
    return null;
  }
}

/** Дата перегляду: «2 листопада, 14:05» — хвилини тут достатні. */
function formatSeen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function useStyleVersion(): StyleVersion {
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState<StyleVersion["status"]>("loading");
  const [seen, setSeen] = useState<Seen | null>(() => readSeen());

  useEffect(() => {
    let alive = true;

    fetch(catalogUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`каталог вигляду: HTTP ${response.status}`);
        return response.json() as Promise<{ version?: string }>;
      })
      .then((raw) => {
        if (!alive) return;
        setVersion(raw.version ?? "");
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, []);

  const markSeen = (): void => {
    if (!version) return;
    const next = { version, at: new Date().toISOString() };
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      /* приватний режим — позначка не переживе перезавантаження */
    }
    setSeen(next);
  };

  return {
    status,
    version,
    previous: seen?.version ?? "",
    updated: Boolean(version && seen && seen.version !== version),
    seenAt: seen ? formatSeen(seen.at) : "",
    markSeen,
  };
}
