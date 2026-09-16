/**
 * Тести композера.
 *
 * Перевіряємо те, що легко зламати мовчки: що відкривається САМЕ «Нотатка» з
 * полем і вставкою, що активна вкладка одна, що заглушка чесно каже «в роботі»
 * і що невідомий ключ не лишає модалку порожньою.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `nav/TabBar.test.tsx`.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComposerModal } from "./ComposerModal";
import { ComposerPlaceholderTab } from "./ComposerPlaceholderTab";
import { COMPOSER_TABS, findComposerTab } from "./tabs";

/** Збереження тут не доходить до API: композер лише віддає чернетку оболонці. */
const noop = async (): Promise<void> => {};

const html = renderToStaticMarkup(<ComposerModal onClose={() => {}} onSaveNote={noop} />);

describe("ComposerModal", () => {
  it("відкривається на «Нотатці»: поле вводу, вставка й кнопки дії", () => {
    expect(html).toContain("wb-composer-input");
    expect(html).toContain("Вставити");
    expect(html).toContain("Зберегти");
    expect(html).toContain("Закрити");
  });

  it("у кожного поля є підпис — у пласкій модалці саме він каже, де що", () => {
    // React віддає `htmlFor` як `for` — у статичній розмітці видно саме його.
    expect(html).toContain('for="wb-composer-note-input"');
    expect(html).toContain('for="wb-composer-tag-input"');
    expect(html).toContain(">Нотатка<");
    expect(html).toContain(">Хештеги<");
  });

  it("поля композера — власні кирпичики, а не .wb-textarea/.wb-input", () => {
    // Це не стилістична примха: у брендових темах ті класи отримують рамку
    // через `!important`, а рамок у композері немає за рішенням.
    expect(html).not.toContain("wb-textarea");
    expect(html).not.toContain("wb-input");
    expect(html).toContain("wb-composer-tags");
    expect(html).toContain('aria-label="Додати хештег"');
  });

  it("стоїть майже на весь екран і складається зі спільних кирпичиків модалки", () => {
    expect(html).toContain("wb-modal-overlay");
    expect(html).toContain("wb-modal--full");
    expect(html).toContain("wb-modal-body");
  });

  it("кнопки дії стоять у ТІЛІ вкладки, а не в прибитому футері", () => {
    // Фіксована смуга забирає місце в полів, а кнопок буде більше, ніж дві.
    // Сторож: рядок дій мусить бути ВСЕРЕДИНІ тіла й після полів.
    expect(html).not.toContain("wb-modal-footer");
    expect(html).not.toContain("wb-composer-foot");
    expect(html).toContain("wb-sheet-actions");
    expect(html.indexOf("wb-composer-body")).toBeLessThan(html.indexOf("wb-sheet-actions"));
    expect(html.indexOf("wb-composer-input")).toBeLessThan(html.indexOf("wb-sheet-actions"));
  });

  it("той самий композер редагує нотатку — коли оболонка дала `initial` з `id`", () => {
    // Окремий редактор мусив би повторити хештеги, ріст поля й стелю довжини —
    // і розійшовся б із формою створення. Різниця тут рівно в заголовку й у
    // тому, що поїде зі збереженням (це вирішує хук).
    const editing = renderToStaticMarkup(
      <ComposerModal
        onClose={() => {}}
        onSaveNote={noop}
        initial={{ id: 7, text: "щось", tags: ["київ"] }}
      />,
    );

    expect(editing).toContain("Редагувати");
    expect(editing).not.toContain(">Створити<");
    expect(editing).toContain("Зберегти зміни");
    // Поля відкриваються з чернеткою, а не порожні — інакше "редагування"
    // затирало б нотатку з першого ж дотику.
    expect(editing).toContain("щось");
    expect(editing).toContain("київ");
  });

  it("створення нового лишається створенням", () => {
    expect(html).toContain("Створити");
    expect(html).toContain(">Зберегти<");
  });

  it("активна вкладка — рівно одна, і це типова", () => {
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/wb-composer-tab--active/g)).toHaveLength(1);
    expect(html.indexOf("wb-composer-tab--active")).toBeLessThan(html.indexOf("Сторінка"));
  });

  it("показує всі вкладки зі складу, зокрема «Сторінку»", () => {
    for (const tab of COMPOSER_TABS) expect(html).toContain(tab.label);
  });

  it("дія збереження є лише там, де інтерфейс уже працює", () => {
    // «Нотатка» — готова вкладка, тож кнопка збереження є
    expect(html).toContain("wb-btn-primary");
  });

  it("порожню нотатку зберегти неможливо — кнопка вимкнена", () => {
    // Рядок без тексту й без хештегів — не чернетка, а випадковий дотик;
    // краще вимкнена кнопка, ніж 400 від сервера.
    expect(html).toMatch(/wb-btn-primary" disabled/);
  });

  it("вкладки стоять стовпчиком і лишаються підписаними для скрінрідера", () => {
    // Підпис вкладки на вузькому екрані ховається (CSS), тож ім'я мусить бути
    // в `aria-label` — інакше кнопка стала б безіменною.
    expect(html).toContain("wb-composer-tabs");
    for (const tab of COMPOSER_TABS) expect(html).toContain(`aria-label="${tab.label}"`);
  });

  it("кнопки вкладень — самі іконки, ім'я дії в aria-label", () => {
    // Вставити + Фото + Відео + Файл (лапка потрібна: `wb-composer-tools` — це
    // обгортка, її ім'я містить ім'я кнопки як підрядок)
    expect(html.match(/wb-composer-tool"/g)).toHaveLength(4);
    for (const label of ["Вставити", "Фото", "Відео", "Файл"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("не має абзацу-інструкції під полем", () => {
    // Такий текст легко повертається «для ясності», а він з'їдає місце
    // й дублює те, що й так каже кнопка.
    expect(html).not.toContain("wb-composer-hint");
  });

  it("дії стоять НАД полем, а не під ним", () => {
    // Порядок у розмітці — те, що легко пересунути випадково: спершу те, чим
    // нотатку наповнюють, далі саме поле.
    expect(html.indexOf("wb-composer-tools")).toBeLessThan(html.indexOf("wb-composer-input"));
  });

  it("вкладки без інтерфейсу описані як заглушка, а не як порожній екран", () => {
    const page = findComposerTab("page");

    expect(page.status).toBe("soon");
    expect(page.planned?.length).toBeGreaterThan(0);
    const markup = renderToStaticMarkup(<ComposerPlaceholderTab tab={page} />);
    expect(markup).toContain("у роботі");
    expect(markup).toContain("wb-composer-plan-item");
  });

  it("невідомий ключ вкладки не лишає композер порожнім", () => {
    expect(findComposerTab("такої-нема").key).toBe("note");
  });
});
