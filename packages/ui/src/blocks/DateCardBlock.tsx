/**
 * Page Builder — Date Card Block.
 *
 * Displays an astrology date card with zodiac sign, element, and numerology data.
 * Uses the user's birthday from BlockContext.user or a custom date.
 *
 * @module packages/ui/src/blocks/DateCardBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const ZODIAC_SIGNS = [
  { name: 'Козеріг', symbol: '♑', dates: '22.12 – 20.01', element: 'Земля' },
  { name: 'Водолій', symbol: '♒', dates: '21.01 – 19.02', element: 'Повітря' },
  { name: 'Риби', symbol: '♓', dates: '20.02 – 20.03', element: 'Вода' },
  { name: 'Овен', symbol: '♈', dates: '21.03 – 20.04', element: 'Вогонь' },
  { name: 'Телець', symbol: '♉', dates: '21.04 – 21.05', element: 'Земля' },
  { name: 'Близнюки', symbol: '♊', dates: '22.05 – 21.06', element: 'Повітря' },
  { name: 'Рак', symbol: '♋', dates: '22.06 – 22.07', element: 'Вода' },
  { name: 'Лев', symbol: '♌', dates: '23.07 – 22.08', element: 'Вогонь' },
  { name: 'Діва', symbol: '♍', dates: '23.08 – 22.09', element: 'Земля' },
  { name: 'Терези', symbol: '♎', dates: '23.09 – 23.10', element: 'Повітря' },
  { name: 'Скорпіон', symbol: '♏', dates: '24.10 – 21.11', element: 'Вода' },
  { name: 'Стрілець', symbol: '♐', dates: '22.11 – 21.12', element: 'Вогонь' },
];

function getZodiacSign(month: number, day: number): typeof ZODIAC_SIGNS[0] {
  const cutoffs = [20, 19, 20, 20, 21, 21, 22, 22, 22, 23, 22, 21];
  const idx = day > cutoffs[month - 1] ? month : (month + 10) % 12;
  return ZODIAC_SIGNS[idx];
}

function reduceToSingleDigit(n: number): number {
  while (n >= 10) {
    n = String(n).split('').reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

export function DateCardBlock({ block, context }: BlockComponentProps) {
  const {
    dateSource = 'user-birthday',
    customDate = '',
    showZodiac = true,
    showElement = true,
    showNumerology = true,
    layout = 'full',
  } = block.props as {
    dateSource?: string;
    customDate?: string;
    showZodiac?: boolean;
    showElement?: boolean;
    showNumerology?: boolean;
    layout?: string;
  };

  // Determine the date to use
  let date: Date | null = null;

  if (dateSource === 'custom' && customDate) {
    date = new Date(customDate);
  } else if (context.user) {
    // Try to get from user profile (my_dates.birthday or fieldMatch)
    const birthday = context.user['birthday'] as string | undefined;
    if (birthday) {
      date = new Date(birthday);
    }
  }

  if (!date || isNaN(date.getTime())) {
    return (
      <div className="wb-block-date-card wb-empty">
        <span className="wb-text-sm wb-text-muted">Дату не вказано</span>
      </div>
    );
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const zodiac = getZodiacSign(month, day);
  const lifePath = reduceToSingleDigit(year + month + day);

  if (layout === 'minimal') {
    return (
      <div className="wb-block-date-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        {showZodiac && <span style={{ fontSize: 'var(--text-3xl)' }}>{zodiac.symbol}</span>}
        <div>
          {showZodiac && <div className="wb-font-semibold">{zodiac.name}</div>}
          {showZodiac && <div className="wb-text-xs wb-text-secondary">{zodiac.dates}</div>}
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div
        className="wb-block-date-card"
        style={{
          padding: 'var(--sp-3)',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 'var(--text-2xl)' }}>{zodiac.symbol}</div>
        <div className="wb-font-semibold wb-text-sm">{zodiac.name}</div>
        <div className="wb-text-xs wb-text-muted">{date.toLocaleDateString('uk-UA')}</div>
      </div>
    );
  }

  // full layout
  return (
    <div
      className="wb-block-date-card"
      style={{
        padding: 'var(--sp-5)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--sp-3)',
        textAlign: 'center',
      }}
    >
      {showZodiac && <div style={{ fontSize: '48px', lineHeight: 1 }}>{zodiac.symbol}</div>}

      {showZodiac && (
        <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>
          {zodiac.name}
        </div>
      )}

      {showZodiac && <div className="wb-text-sm wb-text-secondary">{zodiac.dates}</div>}

      <div className="wb-text-sm" style={{ color: 'var(--text-muted)' }}>
        {date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-2)' }}>
        {showElement && (
          <div style={{ textAlign: 'center' }}>
            <div className="wb-text-xs wb-text-muted">Стихія</div>
            <div className="wb-text-sm wb-font-semibold">{zodiac.element}</div>
          </div>
        )}
        {showNumerology && (
          <div style={{ textAlign: 'center' }}>
            <div className="wb-text-xs wb-text-muted">Число</div>
            <div className="wb-text-sm wb-font-semibold">{lifePath}</div>
          </div>
        )}
      </div>
    </div>
  );
}
