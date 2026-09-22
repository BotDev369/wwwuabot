import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_PAGE_TEMPLATE,
  normalizePageSlug,
  pageAddress,
  pageTemplate,
  primaryField,
  type PageDraft,
  type PageFieldValues,
  type PageTemplate,
  type PageTemplateKey,
} from "@wwwuabot/shared/pages";

/**
 * Чернетка сторінки в композері.
 *
 * **Чому окремий хук, а не ще кілька полів у `useComposer`.** Нотатка — це текст
 * і хештеги, оголошення — вид, ціна й місто, сторінка — шаблон і його поля.
 * Змішавши їх, одна форма перемальовувалась би на кожен символ іншої
 * (`AGENTS.md` §3). Список вкладок спільний — стан у кожної свій.
 *
 * **Адресу складають із назви, доки її не чіпали.** Поле адреси у формі видно
 * завжди (людина мусить мати що показати й за потреби виправити), але воно
 * **слідує** за назвою, поки його не торкнулись: друге поле «адреса», яке треба
 * заповнити руками, суперечило б тому, що шаблон обіцяє — змінюй лише текст.
 * Порожнє поле — це «склади сам» і для сервера (`pageAddress`).
 *
 * **Куди саме ляже сторінка — знає оболонка.** Хук приймає готовий обробник, а
 * не кличе `fetch`: композер спільний, і API-клієнта в нього немає (§3).
 */
export interface UsePageDraftOptions {
  /** Немає обробника — вкладки «Сторінка» немає взагалі (так у панелі). */
  onSavePage?: (draft: PageDraft) => Promise<void>;
  /** Чернетка, з якої почати: є `id` — це правка своєї сторінки. */
  initial?: PageDraft;
}

export interface PageDraftState {
  /** Те, що поїде на сервер: `id` є — правка своєї сторінки. */
  draft: PageDraft;
  /** Шаблон, який обрано зараз: за ним малюються поля. */
  template: PageTemplate;
  /** Змінити одне поле шаблону; решта лишається як була. */
  setValue: (key: string, value: string) => void;
  /** Обрати шаблон. Значення з однаковими ключами переносяться — не губиться. */
  setTemplateKey: (key: PageTemplateKey) => void;
  /** Адреса в полі; порожній рядок означає «склади з назви». */
  address: string;
  setAddress: (value: string) => void;
  /** Чому адреса не годиться — показується **до** збереження, а не 400-ю. */
  addressIssue: string | null;
  setPublic: (value: boolean) => void;
  error: string | null;
  saving: boolean;
  /** Порожня назва: зберігати нема чого — кнопка вимкнена, а не падає 400-ю. */
  empty: boolean;
  /** Зберегти; `true` — вдалось (композер тоді закривається). */
  save: () => Promise<boolean>;
}

export function usePageDraft({ onSavePage, initial }: UsePageDraftOptions): PageDraftState {
  const [templateKey, setTemplateKey] = useState<PageTemplateKey>(
    () => initial?.template ?? DEFAULT_PAGE_TEMPLATE,
  );
  const [values, setValues] = useState<PageFieldValues>(() => ({ ...(initial?.values ?? {}) }));
  // Правка існуючої сторінки — вже «чіпана» адреса: інакше вона побігла б за
  // назвою й мовчки перейменувала посилання, яке автор комусь надіслав.
  const [address, setAddressValue] = useState(() => initial?.address ?? "");
  const [addressEdited, setAddressEdited] = useState(() => initial !== undefined);
  const [isPublic, setPublic] = useState(() => initial?.isPublic ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const template = useMemo(() => pageTemplate(templateKey), [templateKey]);
  const title = values[primaryField(template).key] ?? "";
  const effectiveAddress = addressEdited ? address : normalizePageSlug(title);

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAddress = useCallback((value: string) => {
    setAddressValue(value);
    setAddressEdited(true);
  }, []);

  const addressIssue = useMemo(() => {
    if (!effectiveAddress) return null;
    const check = pageAddress(effectiveAddress, title);
    return check.ok ? null : check.message;
  }, [effectiveAddress, title]);

  const draft = useMemo<PageDraft>(
    () => ({
      ...(initial?.id ? { id: initial.id } : {}),
      template: template.key,
      values,
      address: effectiveAddress,
      isPublic,
    }),
    [initial?.id, template.key, values, effectiveAddress, isPublic],
  );

  const empty = title.trim() === "";

  const save = useCallback(async (): Promise<boolean> => {
    if (!onSavePage) {
      setError("Створення сторінок тут недоступне.");
      return false;
    }

    setSaving(true);
    try {
      await onSavePage(draft);
      setError(null);
      return true;
    } catch (e: unknown) {
      // Причину показуємо як є: «не вдалося» без нічого — це та сама тиша, від
      // якої ми тікали, коли відмовлялись від нативних діалогів (§4).
      setError(e instanceof Error ? e.message : "Не вдалося зберегти сторінку.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSavePage, draft]);

  return {
    draft,
    template,
    setValue,
    setTemplateKey,
    address: effectiveAddress,
    setAddress,
    addressIssue,
    setPublic,
    error,
    saving,
    empty,
    save,
  };
}
