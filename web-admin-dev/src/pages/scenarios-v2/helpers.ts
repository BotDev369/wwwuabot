/**
 * Helper functions for ScenariosV2Table.
 */

import type { IconName } from "@wwwuabot/shared";

/** Бік рядка, який показує список: сторінку (`page_data`) чи бот. */
export type ScenarioSurface = "platform" | "bot";

export function relativeTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн тому`;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function scenarioType(s: {
  rich_message: string | null;
  page_data?: string | null;
}): "photo" | "rich" | "page" {
  if (Boolean(s.page_data) && s.page_data !== "null") return "page";
  if (s.rich_message === "true" || s.rich_message === "1") return "rich";
  return "photo";
}

/**
 * Чи має рядок **подання в боті**: підпис, фото або rich-розмітку.
 *
 * Це не «тип рядка», а другий бік того самого запису: сторінка може бути
 * одночасно й повідомленням. Список «Бот» показує саме ті рядки, у яких цей бік
 * заповнений, а не окрему таблицю.
 */
export function hasBotPresentation(s: Record<string, unknown>): boolean {
  const filled = ["caption_top", "caption_mid", "caption_bot", "photo_url"].some(
    (key) => typeof s[key] === "string" && (s[key] as string).trim() !== "",
  );
  if (filled) return true;
  return s.rich_message === "true" || s.rich_message === "1";
}

export function getTypeBadge(s: { rich_message: string | null; page_data?: string | null }): {
  label: string;
  icon: IconName;
  color: string;
} {
  const type = scenarioType(s);
  if (type === "page") return { label: "Page", icon: "page", color: "var(--color-info, #3b82f6)" };
  if (type === "rich") return { label: "Rich", icon: "sparkles", color: "var(--accent, #6366f1)" };
  return { label: "Photo", icon: "image", color: "var(--text-muted)" };
}

export function getTitle(s: Record<string, unknown>): string {
  return (s.title as string) || (s.slug as string);
}

export function extractPrefix(slug: string): string {
  const idx = slug.indexOf("_");
  return idx > 0 ? slug.slice(0, idx) : slug;
}
