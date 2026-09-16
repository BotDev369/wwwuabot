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

const html = renderToStaticMarkup(<ComposerModal onClose={() => {}} />);

describe("ComposerModal", () => {
  it("відкривається на «Нотатці»: поле вводу, вставка й кнопки дії", () => {
    expect(html).toContain('aria-label="Текст нотатки"');
    expect(html).toContain("wb-composer-input");
    expect(html).toContain("Вставити");
    expect(html).toContain("Зберегти");
    expect(html).toContain("Закрити");
  });

  it("стоїть майже на весь екран і складається зі спільних кирпичиків модалки", () => {
    expect(html).toContain("wb-modal-overlay");
    expect(html).toContain("wb-modal--full");
    expect(html).toContain("wb-modal-body");
    expect(html).toContain("wb-modal-footer");
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
