/**
 * Смужка частки в рядку таблиці: довжина — відсоток від найбільшого.
 *
 * `viewBox` на сто одиниць: довжина задається числом-атрибутом, а не стилем
 * (інлайн-стилі в адмінці заборонені), тож вигляд лишається в CSS.
 * @module web-admin-dev/src/pages/spending/SpendingMeter
 */

interface SpendingMeterProps {
  /** Частка від 0 до 1; більше одиниці не буває, менше нуля — теж. */
  readonly share: number;
}

export function SpendingMeter({ share }: SpendingMeterProps) {
  const width = Math.min(100, Math.max(share * 100, share > 0 ? 1 : 0));
  return (
    <svg className="spend-meter" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      <rect className="spend-meter-fill" x="0" y="0" width={width} height="6" rx="3" />
    </svg>
  );
}
