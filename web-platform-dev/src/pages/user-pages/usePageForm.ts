/**
 * Стан форми сторінки: текст полів, адреса й публічність.
 *
 * **Це колишній стан вкладки композера, і він переїхав разом із нею.** Сторінку
 * з шаблону не вміщує модалка: спершу шаблон **показують**, а текст правлять на
 * самій сторінці — тож форма стала екраном, а хук переїхав туди, де живе екран.
 * Спільним він бути не міг: адреса API є лише в оболонки (`AGENTS.md` §3).
 *
 * **Адресу складають із назви, доки її не чіпали.** Поле адреси видно завжди
 * (людина мусить мати що показати й за потреби виправити), але воно **слідує**
 * за назвою, поки його не торкнулись: друге поле «адреса», яке треба заповнити
 * руками, суперечило б тому, що обіцяє шаблон — змінюй лише текст. Порожнє
 * поле — це «склади сам» і для сервера (`pageAddress`).
 *
 * **Правка не перейменовує себе.** У наявної сторінки адреса вже «чіпана»: вона
 * мусить лишитись тією, яку автор комусь надіслав, навіть якщо назву змінили.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

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
  type UserPage,
} from "@wwwuabot/shared/pages";
// Відносний шлях, а не `@/`: цей модуль покритий тестами
// (`page-screens.test.tsx`), а кореневий `vitest.config.ts` аліаса оболонки не
// читає — того самого правила тримається `create-hub.ts`.
import { pagesApi } from "../../shared/api/pages.api";

/** Те, з чого форма починається: шаблон від вибору, решта — від рядка. */
export interface PageFormInitial {
  /** Є у правки: без нього збереження створило б другу сторінку. */
  id?: number;
  template?: PageTemplateKey;
  values?: PageFieldValues;
  address?: string;
  isPublic?: boolean;
}

export interface PageFormState {
  /** Те, що поїде на сервер: `id` є — правка своєї сторінки. */
  draft: PageDraft;
  /** Шаблон, за яким намальовано сторінку: за ним і поля, і їхні рівні. */
  template: PageTemplate;
  setValue: (key: string, value: string) => void;
  /** Адреса в полі; порожній рядок означає «склади з назви». */
  address: string;
  setAddress: (value: string) => void;
  /** Чому адреса не годиться — показується **до** збереження, а не 400-ю. */
  addressIssue: string | null;
  isPublic: boolean;
  setPublic: (value: boolean) => void;
  error: string | null;
  saving: boolean;
  /** Порожня назва: зберігати нема чого — кнопка вимкнена, а не падає 400-ю. */
  empty: boolean;
  /** Зберегти; `null` — не вдалось (причину показує `error`). */
  save: () => Promise<UserPage | null>;
}

export function usePageForm(initial: PageFormInitial): PageFormState {
  const [templateKey] = useState<PageTemplateKey>(() => initial.template ?? DEFAULT_PAGE_TEMPLATE);
  const [values, setValues] = useState<PageFieldValues>(() => ({ ...(initial.values ?? {}) }));
  // Правка існуючої сторінки — вже «чіпана» адреса: інакше вона побігла б за
  // назвою й мовчки перейменувала посилання, яке автор комусь надіслав.
  const [address, setAddressValue] = useState(() => initial.address ?? "");
  const [addressEdited, setAddressEdited] = useState(() => initial.id !== undefined);
  const [isPublic, setPublic] = useState(() => initial.isPublic ?? false);
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
      ...(initial.id ? { id: initial.id } : {}),
      template: template.key,
      values,
      address: effectiveAddress,
      isPublic,
    }),
    [initial.id, template.key, values, effectiveAddress, isPublic],
  );

  const empty = title.trim() === "";

  const save = useCallback(async (): Promise<UserPage | null> => {
    if (empty) return null;

    setSaving(true);
    try {
      const saved = await pagesApi.save(draft);
      // «Порожньо» від сервера — це не збереження: показати «готово» й повести
      // людину на сторінку, якої немає, гірше за чесну помилку (§4).
      if (!saved) throw new Error("Сервер не підтвердив збереження — спробуйте ще раз.");
      setError(null);
      return saved;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти сторінку.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, empty]);

  return {
    draft,
    template,
    setValue,
    address: effectiveAddress,
    setAddress,
    addressIssue,
    isPublic,
    setPublic,
    error,
    saving,
    empty,
    save,
  };
}
