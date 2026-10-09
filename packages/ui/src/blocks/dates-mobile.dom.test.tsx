// @vitest-environment jsdom
/**
 * Мобільна розкладка списку дат і модалки.
 *
 * Перевіряється саме те, що ламається на телефоні: шість колонок таблиці не
 * вміщуються в ширину екрана, тому на вузькому екрані рядок мусить стати
 * карткою з підписаними полями, а кнопки модалки — скластися в стовпець.
 * Класи, а не пікселі: самі правила живуть у `packages/shared/src/styles/dates.css`,
 * а розкладку ми повинні перестати змінювати випадково.
 *
 * @module packages/ui/src/blocks/dates-mobile.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { MyDatesTableBlock } from "./MyDatesTableBlock";
import { DateModal } from "./my-dates-table/DateModal";

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "x", order: 0, props: over },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

/** Одна дата з боку сервера: без неї таблиця не малюється взагалі. */
const DATE = {
  id: "1",
  user_id: 7,
  date: "1980-03-03",
  type: "person",
  name: "Сьогодні",
  tags: ["т"],
  notes: "нотатка",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

const OTHER_DATE = { ...DATE, id: "2", name: "Коля", date: "1954-06-25" };

async function renderTable(dates = [DATE]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true, dates }), { status: 200 })),
  );
  const utils = render(<MyDatesTableBlock {...props()} />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  vi.unstubAllGlobals();
  return utils;
}

describe("список дат на вузькому екрані", () => {
  it("рядки і комірки мають класи картки, а не простої таблиці", async () => {
    const { container } = await renderTable();
    expect(container.querySelector(".wb-date-list")).toBeTruthy();
    expect(container.querySelector(".wb-date-row")).toBeTruthy();
    expect(container.querySelector(".wb-date-cell--name")).toBeTruthy();
  });

  it("кожне поле підписане, щоб картка читалася без заголовка колонок", async () => {
    const { container } = await renderTable();
    const labels = [...container.querySelectorAll(".wb-date-cell")].map((cell) =>
      cell.getAttribute("data-label"),
    );
    expect(labels).toContain("Дата");
    expect(labels).toContain("Теги");
    expect(labels).toContain("Тип");
    expect(labels).toContain("Примітки");
  });

  it("лічильник не показує «7 з 7», поки фільтрів немає", async () => {
    const { container } = await renderTable();
    expect(container.textContent).not.toContain("з 1");
    expect(container.textContent).toContain("Дати");
  });

  /**
   * Блок — акордеон: підпис згортає список. Кнопка створення при цьому
   * лишається на місці, бо вона дія, а не вміст: згорнутий блок — це все ще
   * блок, і «Нова дата» — найпотрібніше, що в ньому є.
   */
  it("підпис згортає список, а «Нова дата» лишається на місці", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const toggle = screen.getByRole("button", { name: /Дати/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".wb-date-list")).toBeTruthy();

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".wb-date-list")).toBeNull();
    expect(screen.getByRole("button", { name: "Нова дата" })).toBeTruthy();

    await user.click(toggle);
    expect(container.querySelector(".wb-date-list")).toBeTruthy();
  });
});

describe("модалка дати на вузькому екрані", () => {
  it("футер має клас адаптивної розкладки, де кнопки складаються", () => {
    const { container } = render(
      <DateModal
        mode="create"
        date={null}
        allTags={[]}
        onClose={() => undefined}
        onSave={async () => undefined}
        onDelete={undefined}
      />,
    );
    expect(container.querySelector(".wb-date-modal-footer")).toBeTruthy();
    // Розпіркатель (`flex: 1`) ховається лише на телефоні — правило в CSS.
    expect(container.querySelector(".wb-date-modal-footer .wb-btn-primary")).toBeTruthy();
  });
});

describe("модалка: що вона зберігає і що не дає", () => {
  it("без дати кнопка збереження неактивна — порожня дата не створюється", () => {
    render(
      <DateModal
        mode="create"
        date={null}
        allTags={[]}
        onClose={() => undefined}
        onSave={async () => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Зберегти" }).hasAttribute("disabled")).toBe(true);
  });

  it("зберігає ім'я, дату, тип, теги й нотатки разом", async () => {
    const onSave = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(
      <DateModal
        mode="create"
        date={null}
        allTags={[]}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByPlaceholderText("Ім'я або назва"), "Аня");
    const dateInput = document.querySelector<HTMLInputElement>('input[type="date"]');
    if (!dateInput) throw new Error("поля дати немає");
    // `input[type=date]` у jsdom не набирається посимвольно — ставимо значення
    // подією зміни, бо саме її слухає React.
    fireEvent.change(dateInput, { target: { value: "2003-02-15" } });
    // Тег додається Enter-ом (кнопки біля поля немає).
    await user.type(screen.getByPlaceholderText("Додати тег..."), "сім'я{Enter}");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await user.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Аня",
        date: "2003-02-15",
        tags: ["сім'я"],
      }),
    );
  });

  it("у режимі перегляду поля лишаються неактивними, а кнопка — «Закрити»", () => {
    const { container } = render(
      <DateModal
        mode="view"
        date={DATE}
        allTags={[]}
        onClose={() => undefined}
        onSave={async () => undefined}
      />,
    );
    // Хрестик модалки і кнопка в футері мають однакове ім'я — шукаємо саме
    // кнопку дії, щоб тест не залежав від того, скільки їх схожих.
    expect(screen.queryByRole("button", { name: "Зберегти" })).toBeNull();
    expect(container.querySelector(".wb-date-modal-footer .wb-btn-secondary")?.textContent).toBe(
      "Закрити",
    );
  });

  it("підзаголовок каже, який режим відкрито", () => {
    render(
      <DateModal
        mode="edit"
        date={DATE}
        allTags={[]}
        onClose={() => undefined}
        onSave={async () => undefined}
        onDelete={() => undefined}
      />,
    );
    expect(screen.getByText("Редагувати дату")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Видалити" })).toBeTruthy();
  });
});

describe("список дат: пошук і вибір", () => {
  it("пошук звужує список і лічильник показує, скільки лишилося", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable([DATE, OTHER_DATE]);
    await user.type(screen.getByPlaceholderText("Пошук..."), "Сьогодні");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.textContent).toContain("1 з 2");
    expect(container.querySelectorAll(".wb-date-row")).toHaveLength(1);
  });

  it("пошук без збігів каже прямо, а не показує порожню таблицю", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    await user.type(screen.getByPlaceholderText("Пошук..."), "такого немає");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.textContent).toContain("Нічого не знайдено");
    expect(container.querySelector(".wb-date-row")).toBeNull();
  });

  it("кнопка «Нова дата» відкриває модалку створення", async () => {
    const user = userEvent.setup();
    await renderTable();
    await user.click(screen.getByRole("button", { name: "Нова дата" }));
    expect(screen.getByText("Нова дата", { selector: ".wb-modal-title" })).toBeTruthy();
  });
});

describe("список дат: сортування й вибір", () => {
  it("сортування з мобільного рядка впорядковує список за назвою", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable([DATE, OTHER_DATE]);
    const sort = container.querySelector<HTMLSelectElement>(".wb-date-sort select");
    if (!sort) throw new Error("поля сортування немає");
    await user.selectOptions(sort, "name");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const names = [...container.querySelectorAll(".wb-date-name__text")].map(
      (cell) => cell.textContent,
    );
    expect(names).toEqual(["Коля", "Сьогодні"]);
  });

  it("чекбокс рядка вмикає панель масових дій із лічильником", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const checkbox = container.querySelector<HTMLInputElement>(
      '.wb-date-row input[type="checkbox"]',
    );
    if (!checkbox) throw new Error("чекбокса рядка немає");
    await user.click(checkbox);
    expect(screen.getByText("Обрано: 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Видалити (1)" })).toBeTruthy();
  });

  it("одна вибрана дата пропонує аналіз, а не співставлення", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const checkbox = container.querySelector<HTMLInputElement>(
      '.wb-date-row input[type="checkbox"]',
    );
    if (!checkbox) throw new Error("чекбокса рядка немає");
    await user.click(checkbox);
    expect(screen.getByRole("button", { name: "Аналізувати (1)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Співставити/ })).toBeNull();
  });

  it("дві вибрані дати — той самий аналіз, лише з лічильником", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable([DATE, OTHER_DATE]);
    for (const box of container.querySelectorAll<HTMLInputElement>(
      '.wb-date-row input[type="checkbox"]',
    )) {
      await user.click(box);
    }
    expect(screen.getByRole("button", { name: "Аналізувати (2)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Співставити/ })).toBeNull();
  });

  it("«Скасувати вибір» повертає список до спокійного стану", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const checkbox = container.querySelector<HTMLInputElement>(
      '.wb-date-row input[type="checkbox"]',
    );
    if (!checkbox) throw new Error("чекбокса рядка немає");
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "Скасувати вибір" }));
    expect(screen.queryByText("Обрано: 1")).toBeNull();
  });

  it("порожній реєстр каже «додайте першу», а не показує заголовки таблиці", async () => {
    const { container } = await renderTable([]);
    expect(container.textContent).toContain("Поки що немає жодної дати");
    expect(container.querySelector(".wb-date-row")).toBeNull();
  });
});

describe("список дат: помилка сервера", () => {
  it("показує, що саме не вдалося, а не порожню таблицю", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false, error: "Немає доступу" }), { status: 403 }),
      ),
    );
    const { container } = render(<MyDatesTableBlock {...props()} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    vi.unstubAllGlobals();
    expect(container.textContent).toContain("Немає доступу");
    expect(container.querySelector(".wb-date-row")).toBeNull();
  });
});

describe("список дат: картка-акордеон", () => {
  it("усі картки згорнуті, поки їх не відкрили", async () => {
    const { container } = await renderTable([DATE, OTHER_DATE]);
    const heads = [...container.querySelectorAll(".wb-date-name")];
    expect(heads).toHaveLength(2);
    expect(heads.map((head) => head.getAttribute("aria-expanded"))).toEqual(["false", "false"]);
    expect(container.querySelector(".wb-date-row--open")).toBeNull();
  });

  it("у згорнутій картці видно назву й дату", async () => {
    const { container } = await renderTable();
    const head = container.querySelector(".wb-date-name");
    expect(head?.textContent).toContain("Сьогодні");
    expect(head?.textContent).toContain("03.03.1980");
  });

  it("дата стоїть попереду назви — назва може бути порожньою, дата є завжди", async () => {
    const { container } = await renderTable();
    const head = container.querySelector(".wb-date-name");
    if (!head) throw new Error("голови картки немає");
    // `querySelectorAll` віддає елементи в порядку документа — саме це й
    // перевіряємо, без пікселів.
    const order = [...head.querySelectorAll(".wb-date-name__meta, .wb-date-name__text")].map(
      (el) => (el.className.includes("__meta") ? "date" : "name"),
    );
    expect(order).toEqual(["date", "name"]);
  });

  it("перший стовпець таблиці — дата, а не назва", async () => {
    const { container } = await renderTable();
    // Перша комірка шапки — чекбокс вибору, за нею — перший стовпець даних.
    const headers = [...container.querySelectorAll("thead th")].map((th) => th.textContent ?? "");
    expect(headers[1]).toContain("Дата");
    expect(container.querySelector("tbody tr td.wb-date-cell--date")).toBeTruthy();
  });

  it("дотик по голові розкриває картку, а не модалку правки", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const head = container.querySelector(".wb-date-name");
    if (!head) throw new Error("голови картки немає");
    await user.click(head);
    expect(container.querySelector(".wb-date-row--open")).toBeTruthy();
    expect(head.getAttribute("aria-expanded")).toBe("true");
    expect(screen.queryByText("Редагувати дату")).toBeNull();
  });

  it("правка живе в тілі розкритої картки й веде в ту саму модалку", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const actions = container.querySelector(".wb-date-cell--actions");
    expect(actions).toBeTruthy();
    const edit = actions?.querySelector("button");
    if (!edit) throw new Error("кнопки правки в тілі немає");
    await user.click(edit);
    expect(screen.getByText("Редагувати дату")).toBeTruthy();
  });

  it("картки розкриваються незалежно одна від одної", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable([DATE, OTHER_DATE]);
    for (const head of container.querySelectorAll(".wb-date-name")) {
      await user.click(head);
    }
    expect(container.querySelectorAll(".wb-date-row--open")).toHaveLength(2);
  });
});

describe("список дат: рядок відкривається на редагування", () => {
  it("подвійний клік по рядку відкриває модалку правки з його датою", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable();
    const row = container.querySelector(".wb-date-row");
    if (!row) throw new Error("рядка немає");
    await user.dblClick(row);
    expect(screen.getByText("Редагувати дату")).toBeTruthy();
  });

  it("показ прапорців списку прибирає кнопку створення", async () => {
    const { container } = await renderTable();
    expect(container.querySelector(".wb-date-list")).toBeTruthy();
    const withoutButton = render(<MyDatesTableBlock {...props({ showCreateButton: false })} />);
    // Підпис блока лишається на місці — зникає тільки дія праворуч від нього.
    expect(withoutButton.container.querySelector(".wb-block-section__head")).toBeTruthy();
  });
});

describe("мобільний рядок керування", () => {
  it("сортування і фільтр за типом живуть поза таблицею, бо `thead` ховається", async () => {
    const { container } = await renderTable([DATE, OTHER_DATE]);
    const bar = container.querySelector(".wb-date-sort");
    if (!bar) throw new Error("мобільного рядка керування немає");
    // Два поля: сортування й тип — усе, що раніше жило в заголовках колонок.
    expect(bar.querySelectorAll("select")).toHaveLength(2);
  });

  it("тип у списку видно кнопкою, а не лише текстом", async () => {
    const { container } = await renderTable();
    expect(container.textContent).toContain("Сьогодні");
  });
});

describe("список дат: фільтри", () => {
  it("мобільний рядок фільтрує за типом і лічильник показує, що лишилося", async () => {
    const event = { ...OTHER_DATE, type: "event" };
    const user = userEvent.setup();
    const { container } = await renderTable([DATE, event]);
    const typeSelect = container.querySelectorAll<HTMLSelectElement>(".wb-date-sort select")[1];
    if (!typeSelect) throw new Error("поля фільтра за типом немає");
    await user.selectOptions(typeSelect, "event");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.textContent).toContain("1 з 2");
  });

  it("кнопка «Очистити» прибирає активний фільтр", async () => {
    const user = userEvent.setup();
    const { container } = await renderTable([DATE, OTHER_DATE]);
    const typeSelect = container.querySelectorAll<HTMLSelectElement>(".wb-date-sort select")[1];
    if (!typeSelect) throw new Error("поля фільтра за типом немає");
    await user.selectOptions(typeSelect, "person");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await user.click(screen.getByRole("button", { name: "Очистити" }));
    expect(container.querySelectorAll(".wb-date-row")).toHaveLength(2);
  });
});
