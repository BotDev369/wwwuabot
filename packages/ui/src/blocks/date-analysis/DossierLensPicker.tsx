/**
 * Вибір систем аналізу: людина сама каже, які лінзи читають дату. Без вибору
 * досьє не рахується й не показується — жодного мовчазного «все підряд».
 *
 * @module packages/ui/src/blocks/date-analysis/DossierLensPicker
 */

import { useEffect, useState, type FormEvent } from "react";
import { LENSES } from "@wwwuabot/shared/qualities";

interface PickerProps {
  readonly selected: readonly string[];
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onApply: (lenses: string[]) => void;
}

function namesOf(ids: readonly string[]): string {
  return ids.map((id) => LENSES.find((lens) => lens.id === id)?.name ?? id).join(", ");
}

export function DossierLensPicker({ selected, open, onToggle, onApply }: PickerProps) {
  const selectedKey = selected.join(",");
  const [draft, setDraft] = useState<string[]>(() => [...selected]);

  useEffect(() => {
    if (open) setDraft(selectedKey ? selectedKey.split(",") : []);
  }, [open, selectedKey]);

  function toggle(id: string): void {
    setDraft((current) =>
      current.includes(id) ? current.filter((one) => one !== id) : [...current, id],
    );
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (draft.length > 0) onApply(draft);
  }

  return (
    <aside className="wb-dossier-lenses">
      <div className="wb-dossier-lenses__head">
        <p className="wb-dossier-lenses__title">Системи аналізу</p>
        {!open && (
          <button type="button" className="wb-dossier-lenses__change" onClick={onToggle}>
            Змінити
          </button>
        )}
      </div>

      {open ? (
        <form onSubmit={submit}>
          <p className="wb-dossier-lenses__text">
            Оберіть системи, які читатимуть дату. Кожна має власні правила, показує свої розрахунки
            й може сказати «не знаю». Без вашого вибору ми нічого не рахуємо.
          </p>
          <ul className="wb-dossier-lenses__list">
            {LENSES.map((lens) => (
              <li key={lens.id}>
                <label className="wb-dossier-lenses__option">
                  <input
                    type="checkbox"
                    checked={draft.includes(lens.id)}
                    onChange={() => toggle(lens.id)}
                  />
                  <span className="wb-dossier-lenses__name">{lens.name}</span>
                  <span className="wb-dossier-lenses__rule">{lens.rule}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="submit"
            className="wb-btn wb-btn-primary wb-dossier-lenses__apply"
            disabled={draft.length === 0}
          >
            Порахувати портрет
          </button>
        </form>
      ) : (
        <p className="wb-dossier-lenses__selected">Системи: {namesOf(selected)}</p>
      )}
    </aside>
  );
}
