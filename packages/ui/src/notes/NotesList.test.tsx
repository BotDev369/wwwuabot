/**
 * Список нотаток — розмітка картки-акордеона.
 *
 * Перевіряємо те, що легко зламати мовчки: що **всі** картки закриті (розкрита
 * картка це вибір людини, а не стан списку), що закрита показує рівно два рядки
 * — початок тексту з датою-часом і хештеги, — і що **переноси в рядку
 * згортаються**: інакше «початок тексту» з'їдав би пів екрана, тобто саме те,
 * від чого ми тікали.
 *
 * Одна річ перевіряється **разом із CSS**: що хештег у картці — підпис
 * (`.wb-note-tag`), а не чип. Це не смак: у чипа бренди задають мірки з
 * `!important` (Apple — `padding: 7px 16px`), і рядок хештегів виходив удвічі
 * вищим за рядок із текстом, а самі хештеги розповзались на пів екрана. Так
 * само зроблено в `NotesToolbar.test.tsx` — властивість, яку легко зламати
 * мовчки, тримає тест, а не коментар.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, і правила CSS, а не дотики: розкриття тут можна перевірити лише
 * подією, а подій без DOM немає. Тому тест тримає саме межу «закрита — це
 * типове».
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { type CollectionView } from "../collection";
import { NotesList } from "./NotesList";
import type { NotesGroup } from "./types";

/** Спільні стилі: розмітку картки рендерить спільний модуль, тож і правила там. */
const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/components.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Тіло правила за селектором — щоб перевіряти саме його, а не файл цілком. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

/** Нотатка-фікстура: усе, крім переданого, має осмислений типовий вигляд. */
function note(id: number, over: Partial<NoteRow> = {}): NoteRow {
  return {
    id,
    scope: "user",
    owner_id: "1",
    text: `нотатка ${id}`,
    tags: [],
    created_at: "2026-09-16 10:00:00",
    updated_at: "2026-09-16 15:19:00",
    ...over,
  };
}

function render(
  notes: NoteRow[],
  found: string[] = [],
  openIds: number[] = [],
  collection: CollectionView = { layout: "rows", columns: 2 },
): string {
  const groups: NotesGroup[] = [{ key: "all", label: "Усі нотатки", notes }];
  return renderToStaticMarkup(
    <NotesList
      groups={groups}
      found={found}
      openIds={openIds}
      onToggle={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      collection={collection}
    />,
  );
}

describe("NotesList", () => {
  it("закриті картки — це порожній `openIds`, а не пам'ять картки", () => {
    const html = render([note(1), note(2)]);

    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).not.toContain("wb-note-item--open");
    // Тіло розкритої картки несе кнопки дій — у закритому списку його немає.
    expect(html).not.toContain("wb-note-card-body");
    expect(html).not.toContain("Редагувати");
  });

  it("розгорнутим стає рівно той, кого назвав `openIds` — це стан екрана", () => {
    // Саме на цьому тримається «розгорнути всі»: коли кожна картка пам'ятала
    // своє, проштовхати в неї рішення ззовні було б нічим.
    const html = render([note(1), note(2), note(3)], [], [2]);
    const open = [...html.matchAll(/<li class="([^"]*)"/g)].map((match) => match[1]);

    expect(open).toEqual(["wb-note-item", "wb-note-item wb-note-item--open", "wb-note-item"]);
    // Розкрите тіло несе повний текст і дії — і тільки воно.
    expect(html.match(/wb-note-card-body/g)).toHaveLength(1);
    expect(html).toContain("Змінено");
  });

  it("розгорнути всі — це той самий стан: усі `openIds` одразу", () => {
    const html = render([note(1), note(2)], [], [1, 2]);

    expect(html.match(/aria-expanded="true"/g)).toHaveLength(2);
    expect(html.match(/wb-note-item--open/g)).toHaveLength(2);
  });

  it("показує рівно два рядки інфо: текст із датою-часом і хештеги", () => {
    const html = render([note(1, { text: "купити каву", tags: ["київ", "лал"] })]);

    expect(html).toContain("wb-note-card-line");
    expect(html).toContain("купити каву");
    // Дата й час у тому самому рядку, що текст, — і у форматі, зрозумілому
    // людині. Саму годину не звіряємо буквою: її показ залежить від таймзони
    // машини, а `formatNoteStamp` — не те, що тут перевіряється (`format`
    // має власний тест).
    expect(html).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
    expect(html).toContain("wb-note-card-tags");
    expect(html).toContain("#київ");
  });

  it("переноси в рядку згортаються: початок тексту — справді один рядок", () => {
    // Це і була вимога «акордеон із двома рядками»: багаторядковий текст у
    // згорнутій картці зробив би зі списку полотно.
    const html = render([note(1, { text: "перший рядок\n\nдругий   рядок" })]);

    expect(html).toContain("перший рядок другий рядок");
    expect(html).not.toContain("перший рядок\n");
  });

  it("нотатка без тексту не лишає рядок порожнім", () => {
    // Нотатка з самих хештегів — теж нотатка: порожній рядок виглядав би як
    // картка, яка не завантажилась.
    const html = render([note(1, { text: "   ", tags: ["київ"] })]);

    expect(html).toContain("Без тексту");
    expect(html).toContain("#київ");
  });

  it("хештеги стоять приглушено — вони не голосніші за текст", () => {
    const html = render([note(1, { tags: ["київ"] })]);

    const tags = html.slice(html.indexOf("wb-note-card-tags"));
    expect(tags).toContain("wb-note-tag");
    expect(tags).not.toContain("wb-chip");
  });

  it("хештег у картці — підпис, а не чип: мірки бренду його не роздувають", () => {
    // Досі тут стояв `.wb-chip`, і бренди додавали йому свій `padding` з
    // `!important` — хештеги розповзались, а рядок робився вдвічі вищим за
    // текст. Тепер мірок навколо хештега немає взагалі.
    expect(rule(".wb-note-tag")).not.toContain("padding");
    expect(rule(".wb-note-tag")).toContain("font-size: var(--text-sm)");
    expect(rule(".wb-note-tag")).toContain("color: var(--text-secondary)");
    // Між хештегами — тільки проміжок: мірок, які треба розсувати, немає.
    expect(rule(".wb-note-card-tags")).toContain("gap: var(--sp-1) var(--sp-2)");
  });

  it("підписи картки читабельні, але тихіші за текст", () => {
    // `--text-xs` (12px) на телефоні не читався, а різний кегль у двох підписів
    // одного рядка виглядав як недогляд: обидва — `--text-sm`, а різниця лише
    // в кольорі.
    for (const selector of [".wb-note-tag", ".wb-note-card-stamp"]) {
      expect(rule(selector)).toContain("font-size: var(--text-sm)");
    }
    expect(rule(".wb-note-card-stamp")).toContain("color: var(--text-muted)");
    expect(rule(".wb-note-card-stamp")).not.toContain("var(--text-primary)");
  });

  it("знайдений тег виділений акцентом, а решта — ні", () => {
    const html = render([note(1, { tags: ["карас", "нотатки"] })], ["карас"]);
    const rendered = [...html.matchAll(/<span class="([^"]*)">#([^<]+)<\/span>/g)].map((match) => ({
      classes: match[1],
      tag: match[2],
    }));

    expect(rendered).toEqual([
      { classes: "wb-note-tag wb-note-tag--hit", tag: "карас" },
      { classes: "wb-note-tag", tag: "нотатки" },
    ]);
  });

  it("акцент виділяє знайдене кольором, а вагу підпису не чіпає", () => {
    expect(rule(".wb-note-tag--hit")).toContain("color: var(--accent)");
    expect(rule(".wb-note-tag--hit")).not.toContain("font-weight");
  });

  it("картка низька: найменший проміжок між двома рядками інфо", () => {
    expect(rule(".wb-note-card")).toContain("gap: var(--sp-1)");
    expect(rule(".wb-note-card")).toContain("padding: var(--sp-2) var(--sp-3)");
  });

  it("вигляд — це клас розкладки, а не друга розмітка", () => {
    // Другий набір розмітки розійшовся б із першим на першій же правці, тож
    // плитки відрізаються від рядків рівно в одному місці — у <ul>.
    const rows = render([note(1, { tags: ["київ"] })]);
    const cards = render([note(1, { tags: ["київ"] })], [], [], { layout: "cards", columns: 2 });

    expect(rows).toContain("wb-note-list wb-collection wb-collection--rows");
    expect(cards).toContain(
      "wb-note-list wb-collection wb-collection--cards wb-collection--cols-2",
    );
    expect(cards.replace("wb-collection--cards wb-collection--cols-2", "wb-collection--rows")).toBe(
      rows,
    );
  });

  it("розкладку задає кирпичик, а не список: двох `display` на одному елементі немає", () => {
    // Інакше вибір вигляду залежав би від порядку правил у файлі.
    expect(rule(".wb-note-list")).not.toContain("display");
    expect(rule(".wb-collection--cards")).toContain(
      "repeat(var(--collection-cols, 2), minmax(0, 1fr))",
    );
  });

  it("плитка читається плиткою: три рядки тексту, дата з кареткою під ним, хештеги знизу", () => {
    // Обрізати «однією лінією» правильно в рядку (там поруч стоїть дата), а в
    // плитці це виглядало б як обрубок; мета в плитці стоїть знизу.
    const tile = rule(".wb-collection--cards .wb-note-card-text");
    expect(tile).toContain("-webkit-line-clamp: 3");
    expect(tile).toContain("grid-column: 1 / -1");

    expect(rule(".wb-collection--cards .wb-note-card-line")).toContain("display: grid");
    expect(rule(".wb-collection--cards .wb-note-card-tags")).toContain("order: 1");
    // Плитка не коротша за найменшу мірку — інакше картка з трьома словами
    // виглядала б як обрізана.
    expect(rule(".wb-collection--cards .wb-note-item")).toContain("min-height");
  });

  it("розкриття лишається тим самим і в плитках", () => {
    // Картка росте на місці: інакше «розгорнути всі» переставало б працювати
    // від самої лише зміни вигляду.
    const html = render([note(1), note(2)], [], [2], { layout: "cards", columns: 1 });

    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html.match(/wb-note-card-body/g)).toHaveLength(1);
  });
});
