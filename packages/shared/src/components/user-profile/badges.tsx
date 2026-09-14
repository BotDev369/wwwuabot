import { icons, type IconName } from "../icons";

/** Іконка з shared у боксі фіксованого розміру: `icons[name]` — готовий SVG. */
export const ico = (name: IconName, size = 16) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    {icons[name]}
  </span>
);

/**
 * Кольори бейджів — токени теми, а не hex: інакше `data-brand` і `data-theme`
 * до картки не доходять. `fallback` — для невідомих значень із бази.
 */
const NEUTRAL = { bg: "var(--surface-active)", color: "var(--text-secondary)" };

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: "var(--green-dim)", color: "var(--green)" },
  pending: { bg: "var(--yellow-dim)", color: "var(--yellow)" },
  suspended: { bg: "var(--red-dim)", color: "var(--red)" },
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin: { bg: "var(--yellow-dim)", color: "var(--yellow)" },
  vip: { bg: "var(--accent-dim)", color: "var(--accent)" },
  moderator: { bg: "var(--accent-dim)", color: "var(--accent)" },
  user: NEUTRAL,
};

function Pill({ label, tone }: { label: string; tone: { bg: string; color: string } }) {
  return (
    <span
      style={{
        background: tone.bg,
        color: tone.color,
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return <Pill label={value} tone={STATUS_STYLES[value] ?? NEUTRAL} />;
}

export function RoleBadge({ value }: { value: string }) {
  return <Pill label={value} tone={ROLE_STYLES[value] ?? NEUTRAL} />;
}
