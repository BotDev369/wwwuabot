import type { ReactElement, ReactNode } from "react";
import {
  AD_BODY_MAX,
  AD_KINDS,
  AD_KIND_LABELS,
  AD_PLACE_MAX,
  AD_PRICE_MAX,
  AD_TITLE_MAX,
  type AdDraft,
} from "@wwwuabot/shared/ads";
import { useAutoGrowField } from "../hooks";

/**
 * Вкладка «Оголошення» — форма дошки.
 *
 * **Вид обирають кнопками, а не списком.** Дропдауни в продукті заборонені
 * (§4), а список із дев'яти рядків у модалці з'їв би пів екрана; ряд кнопок
 * видно весь одразу, і він же показує, які види взагалі бувають.
 *
 * **Ціна — поле вводу, а не число.** «Договірна» — теж ціна; числове поле
 * змусило б людину вигадувати нуль, і оголошення читалось би як безкоштовне.
 *
 * Поля мають підписи: у композері немає рамок, і без підпису не видно, де
 * заголовок, а де текст (той самий підхід, що у вкладки «Нотатка»).
 */
export function ComposerAdTab({
  draft,
  onChange,
  error,
  actions,
}: {
  draft: AdDraft;
  onChange: (patch: Partial<AdDraft>) => void;
  error: string | null;
  /** Кнопки дії — останній рядок тіла (їх тримає композер, не вкладка). */
  actions?: ReactNode;
}): ReactElement {
  const bodyRef = useAutoGrowField(draft.body);

  return (
    <div className="wb-composer-pane">
      <div className="wb-composer-field">
        <span className="wb-label">Що це</span>
        <div className="wb-composer-kinds" role="group" aria-label="Вид оголошення">
          {AD_KINDS.map((kind) => {
            const active = kind === draft.kind;
            return (
              <button
                key={kind}
                type="button"
                className={`wb-composer-kind${active ? " wb-composer-kind--active" : ""}`}
                aria-pressed={active}
                onClick={() => onChange({ kind })}
              >
                {AD_KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="wb-composer-field">
        <label className="wb-label" htmlFor="wb-composer-ad-title">
          Заголовок
        </label>
        <input
          id="wb-composer-ad-title"
          className="wb-composer-input"
          value={draft.title}
          maxLength={AD_TITLE_MAX}
          placeholder="Коротко: що саме"
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div className="wb-composer-field">
        <label className="wb-label" htmlFor="wb-composer-ad-body">
          Опис
        </label>
        <textarea
          id="wb-composer-ad-body"
          ref={bodyRef}
          className="wb-composer-input"
          value={draft.body}
          maxLength={AD_BODY_MAX}
          placeholder="Деталі: стан, умови, подробиці…"
          onChange={(event) => onChange({ body: event.target.value })}
        />
      </div>

      {/* Ціна й місце — пара: у житті вони й читаються разом («2 000 ₴, Київ»),
          і кожне з них коротке, тож у стовпчик вони займали б два повні рядки. */}
      <div className="wb-composer-pair">
        <div className="wb-composer-field">
          <label className="wb-label" htmlFor="wb-composer-ad-price">
            Ціна
          </label>
          <input
            id="wb-composer-ad-price"
            className="wb-composer-input"
            value={draft.price}
            maxLength={AD_PRICE_MAX}
            placeholder="Договірна"
            onChange={(event) => onChange({ price: event.target.value })}
          />
        </div>

        <div className="wb-composer-field">
          <label className="wb-label" htmlFor="wb-composer-ad-place">
            Місто
          </label>
          <input
            id="wb-composer-ad-place"
            className="wb-composer-input"
            value={draft.place}
            maxLength={AD_PLACE_MAX}
            placeholder="Де"
            onChange={(event) => onChange({ place: event.target.value })}
          />
        </div>
      </div>

      {error && (
        <p className="wb-composer-error" role="alert">
          {error}
        </p>
      )}

      {actions && <div className="wb-sheet-actions">{actions}</div>}
    </div>
  );
}
