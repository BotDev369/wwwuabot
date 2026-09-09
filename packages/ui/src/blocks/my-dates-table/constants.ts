/**
 * Constants for MyDatesTable block.
 */

export const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  person: { label: "Людина", color: "#2563eb", bg: "#eff6ff" },
  event: { label: "Подія", color: "#059669", bg: "#ecfdf5" },
  other: { label: "Інше", color: "#7c3aed", bg: "#f5f3ff" },
};

export const TAG_COLORS = [
  { color: "#b45309", bg: "#fef3c7" },
  { color: "#0e7490", bg: "#ecfeff" },
  { color: "#be185d", bg: "#fdf2f8" },
  { color: "#4338ca", bg: "#eef2ff" },
  { color: "#047857", bg: "#ecfdf5" },
  { color: "#c2410c", bg: "#fff7ed" },
  { color: "#7c3aed", bg: "#f5f3ff" },
  { color: "#0369a1", bg: "#f0f9ff" },
];

export function getTagColor(tag: string): { color: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function getTypeConfig(type: string): { label: string; color: string; bg: string } {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.other;
}

export function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
