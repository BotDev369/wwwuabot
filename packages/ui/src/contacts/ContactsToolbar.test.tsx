/**
 * Смуга керування контактами — **настройка спільної смуги**.
 *
 * Саму смугу перевіряє `notes/NotesToolbar.test.tsx` (розмітка, CSS, чипи — усе
 * спільне). Тут перевіряється те, що може зламатись **лише в контактах**: що
 * адаптер віддає свої варіанти й свої слова — пошук за іменем, «За іменем» у
 * сортуванні, «контакти» в підписі чипа й перемикача. Помилка тут не впала б
 * ніде: список просто сортувався б «як нотатки», і ніхто б не помітив.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку
 * рендерить React.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactsToolbar } from "./ContactsToolbar";
import { DEFAULT_CONTACTS_VIEW, type ContactsView } from "./types";

const view = (over: Partial<ContactsView> = {}): ContactsView => ({
  ...DEFAULT_CONTACTS_VIEW,
  ...over,
});

function render(over: Partial<ContactsView> = {}, allOpen = false): string {
  return renderToStaticMarkup(
    <ContactsToolbar
      view={view(over)}
      onChange={() => {}}
      tags={["друг", "київ"]}
      shown={2}
      total={2}
      allOpen={allOpen}
      onToggleAll={() => {}}
    />,
  );
}

describe("ContactsToolbar", () => {
  it("шукає за іменем, хендлом і хештегом — і каже це скрінрідеру", () => {
    const html = render();

    expect(html).toContain('placeholder="Пошук"');
    expect(html).toContain('aria-label="Пошук за іменем, хендлом або хештегом"');
  });

  it("має три вибори зі своїми варіантами", () => {
    const html = render({ groupBy: "day" });

    expect(html).toContain('aria-label="Сортування: Спочатку змінені"');
    expect(html).toContain('aria-label="Групування: За днями"');
    expect(html).toContain('aria-label="Хештеги: Усі теги"');
  });

  it("типово груп немає — і клітинка каже це словом", () => {
    // «Без груп» — типовий стан, а не вибір: список відкривають, щоб знайти
    // людину, і «Сьогодні / Вчора» ріжуть його за датою зміни, хоч шукають за
    // іменем. Увімкнене групування показує чип.
    expect(render()).toContain('aria-label="Групування: Без груп"');
    expect(render({ groupBy: "tag" })).toContain(">За тегами<");
  });

  it("перемикач каже про контакти, а не про нотатки", () => {
    expect(render()).toContain('aria-label="Розгорнути всі контакти"');
    expect(render({}, true)).toContain('aria-label="Згорнути всі контакти"');
  });

  it("чип сортування називає контактний варіант", () => {
    const html = render({ sort: "name" });

    expect(html).toContain(">За іменем<");
    expect(html).toContain("Повернути типовий порядок (Змінені)");
  });

  it("«без хештегів» каже саме про контакти", () => {
    expect(render({ tags: { kind: "untagged" } })).toContain("Показати й контакти з хештегами");
  });

  it("скільки знайдено — видно лише тоді, коли список звужено", () => {
    const narrowed = renderToStaticMarkup(
      <ContactsToolbar
        view={view({ query: "київ" })}
        onChange={() => {}}
        tags={["київ"]}
        shown={1}
        total={4}
        allOpen={false}
        onToggleAll={() => {}}
      />,
    );

    expect(narrowed).toContain("wb-tools-summary");
    expect(narrowed).toContain("Знайдено 1 із 4");
    expect(render()).not.toContain("wb-tools-summary");
  });
});
