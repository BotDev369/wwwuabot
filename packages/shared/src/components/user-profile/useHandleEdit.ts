import { useState } from "react";
import { PLATFORM_USERNAME_MAX, validatePlatformUsername } from "../../user/platform-username";

/**
 * Локальний стан редагування імені на платформі.
 *
 * Компонент лишається рендерингом: перевірка введеного, стан «зберігаю» і
 * текст помилки живуть тут. Перевірка — та сама спільна функція, що й на
 * сервері, тож людина дізнається про причину відмови **до** запиту, а не з
 * 500-ї відповіді.
 *
 * `onSubmit` повертає рядок-помилку або `null`: що сказати про невдачу,
 * вирішує той, хто справді знає (API), а не форма.
 */
export function useHandleEdit(
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

    const validated = validatePlatformUsername(value);
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
    maxLength: PLATFORM_USERNAME_MAX,
    setValue,
    open,
    cancel,
    save,
  };
}
