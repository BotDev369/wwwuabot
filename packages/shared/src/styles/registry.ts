/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STYLE REGISTRY — один стиль-бренд проєкту × дві схеми
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Застосовується лише CSS-атрибутами — без жодного JS-стилю в рантаймі:
 *   <html data-brand="android" data-theme="light|dark">
 *
 * **Бренд не вибирається.** Матеріал — стиль самого продукту: він задає
 * типографіку, радіуси, підняття й рух, і людина не має чого тут обирати.
 * Тому `Brand` — це одна константа, а не список: вибір із одного пункту —
 * це поле, у якому завжди стоїть те саме, і воно лише множить правки.
 *
 * Значення атрибута лишається (`data-brand="android"`), бо на ньому тримаються
 * правила, яким потрібен бренд у селекторі (`html[data-brand][data-theme]`) —
 * це те саме, що робила пара брендів.
 */

/** Єдиний стиль-бренд продукту. Інших значень не існує й не буде. */
export type Brand = "android";

/** Атрибут `<html>`: стиль продукту. */
export const BRAND: Brand = "android";

/** Схема — світла чи темна. «Системної» немає: світлоту виводить вибір кольорів. */
export type Scheme = "light" | "dark";

export type Theme = Scheme;

/** Типографіка стилю. Три стеки — убо, заголовки, моноширинний. */
export const BRAND_FONTS = {
  fontUi: '"Roboto", "Google Sans", system-ui, -apple-system, sans-serif',
  fontDisplay: '"Roboto", "Google Sans", system-ui, -apple-system, sans-serif',
  fontMono: '"Roboto Mono", "Google Sans Mono", "Courier New", ui-monospace, monospace',
} as const;
