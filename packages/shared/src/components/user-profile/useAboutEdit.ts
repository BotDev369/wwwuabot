import { useState } from "react";
import { ABOUT_MAX_LENGTH, validateAbout } from "../../user/public-profile";

/**
 * Локальний стан редагування «Про себе».
 *
 * Той самий поділ, що в `useHandleEdit`: компонент лишається рендерингом, а
 * перевірка введеного й текст помилки живуть тут. Перевірка — **та сама**
 * спільна функція, що й на сервері, тож причина відмови приходить до запиту.
 *
 * `onSubmit` повертає рядок-помилку або `null`: що сказати про невдачу, знає
 * той, хто справді знає (API), а не форма.
 */
export function useAboutEdit(
  initial: string | null | undefined,
  onSubmit?: (value: string) => Promise<string | null>,
) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setValue(initial ?? "");
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (saving) return;

    const validated = validateAbout(value);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const failure = await onSubmit?.(validated.value);
      if (failure) {
        setError(failure);
        return;
      }
      setValue(validated.value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return {
    editing,
    value,
    saving,
    error,
    maxLength: ABOUT_MAX_LENGTH,
    setValue,
    open,
    cancel,
    save,
  };
}
