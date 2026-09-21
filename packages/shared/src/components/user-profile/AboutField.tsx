import { ico } from "./badges";
import { useAboutEdit } from "./useAboutEdit";

/**
 * «Про себе» — те, що людина розповідає про себе сама.
 *
 * **Блок, а не рядок.** Це єдине поле профілю, яке людина пише, а не обирає, і
 * воно довге (до 900 символів): у рядку «підпис → значення» такий текст
 * перетворився б на вузьку колонку праворуч, яку неможливо читати на телефоні.
 *
 * **Без `onSubmit` блок лишається читанням** — так його бачить той, хто
 * дивиться на чужого користувача: текст видно, але переписати його випадково
 * не можна.
 *
 * Лічильник символів показується лише під час правки: у готовому тексті він
 * нічого не додає, а місце займає.
 */
export function AboutField({
  value,
  onSubmit,
}: {
  value?: string | null;
  onSubmit?: (value: string) => Promise<string | null>;
}) {
  const edit = useAboutEdit(value, onSubmit);
  const text = (value ?? "").trim();
  const canEdit = Boolean(onSubmit);

  return (
    <div className="wb-about">
      <div className="wb-about-head">
        <span className="wb-about-label">Про себе</span>
        {canEdit && !edit.editing && (
          <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={edit.open}>
            {ico("edit", 14)} {text ? "Змінити" : "Додати"}
          </button>
        )}
      </div>

      {edit.editing ? (
        <div className="wb-about-form">
          <textarea
            className="wb-about-input"
            value={edit.value}
            maxLength={edit.maxLength}
            rows={4}
            placeholder="Кілька слів про себе"
            aria-label="Про себе"
            onChange={(e) => edit.setValue(e.target.value)}
          />
          {edit.error && (
            <div className="wb-about-error">
              {ico("warning", 14)} <span>{edit.error}</span>
            </div>
          )}
          <div className="wb-about-foot">
            <span className="wb-about-count">
              {edit.value.length} / {edit.maxLength}
            </span>
            <div className="wb-about-actions">
              <button
                className="wb-btn wb-btn-primary wb-btn-sm"
                disabled={edit.saving}
                onClick={() => void edit.save()}
              >
                {edit.saving ? "Зберігаємо…" : "Зберегти"}
              </button>
              <button
                className="wb-btn wb-btn-secondary wb-btn-sm"
                disabled={edit.saving}
                onClick={edit.cancel}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className={`wb-about-text${text ? "" : " wb-about-text--empty"}`}>
          {text || "Ще не заповнено"}
        </p>
      )}
    </div>
  );
}
