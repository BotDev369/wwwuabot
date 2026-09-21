/**
 * `SchemeList` — список схем з трьома станами: чекаємо, зламалось, порожньо.
 *
 * Спільний для трьох екранів («Мої схеми», «Публічні схеми» й вкладка «Теми» в
 * Просторі), бо це **той самий список**: картки, скелет, відмова, порожнеча.
 * Три копії розійшлися б на першій же правці — і в одному місці зникла б
 * кнопка «спробувати ще», а в другому «порожньо» перестало б казати причину.
 *
 * **Порожнеча каже, що робити.** «Нічого немає» без продовження читається як
 * поламаний екран, тож текст і кнопка приходять від того, хто знає, звідки
 * схема береться (власна — з «Налаштувати», чужа — із чужого вибору).
 *
 * @module web-platform-dev/src/pages/themes/SchemeList
 */

import type { ReactElement, ReactNode } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { isThemeApplied, type ThemeScheme } from "@wwwuabot/shared/themes";
import { SchemeCard } from "./SchemeCard";
import type { AppliedLook } from "./useAppliedScheme";

export interface SchemeListProps {
  items: readonly ThemeScheme[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Що діє на екрані зараз — щоб картка могла сказати «застосовано». */
  applied: AppliedLook;
  onApply: (scheme: ThemeScheme) => void;
  /** `true` — свої схеми: тоді видно «змінити» й «прибрати». */
  mine?: boolean;
  onEdit?: (scheme: ThemeScheme) => void;
  onRemove?: (scheme: ThemeScheme) => void;
  /** Порожній стан: знак, пояснення й (необов'язково) кнопка. */
  empty: { icon: IconName; title: string; hint: string; action?: ReactNode };
}

export function SchemeList({
  items,
  loading,
  error,
  onRetry,
  applied,
  onApply,
  mine = false,
  onEdit,
  onRemove,
  empty,
}: SchemeListProps): ReactElement {
  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 180, height: 20 }} />
        <p className="wb-text-muted">Завантаження…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="warning" size={32} />
        </span>
        <p className="wb-text-red">{error}</p>
        <button className="wb-btn wb-btn-secondary" onClick={onRetry}>
          Спробувати ще
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name={empty.icon} size={32} />
        </span>
        <p className="wb-empty-text">{empty.title}</p>
        <p className="wb-empty-text">{empty.hint}</p>
        {empty.action}
      </div>
    );
  }

  return (
    <div className="wb-theme-schemes">
      {items.map((scheme) => (
        <SchemeCard
          key={scheme.id}
          scheme={scheme}
          mine={mine}
          applied={isThemeApplied(scheme, applied.colors, applied.font)}
          onApply={() => onApply(scheme)}
          {...(onEdit ? { onEdit: () => onEdit(scheme) } : {})}
          {...(onRemove ? { onRemove: () => onRemove(scheme) } : {})}
        />
      ))}
    </div>
  );
}
