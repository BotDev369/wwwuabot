// @vitest-environment jsdom
/**
 * Смуга колекції — поле пошуку й те, що воно каже клавіатурі телефона.
 *
 * Перевіряємо рівно ту частину, яку легко зламати мовчки: пошук — це
 * `type="search"` із клавішею «Знайти», без автопідказок, автозаголовків і
 * перевірки орфографії. Без цього на iOS клавіатура пише «Пошук» із великої
 * літери й виправляє запит словником, а на Android Enter виглядає як «Ввести».
 *
 * Решта — про те, що смуга лишається смугою: ✕ прибирає свій запит, а вибір
 * відкривається поверхнею й закривається після вибору.
 *
 * @module packages/ui/src/collection/CollectionToolbar.test
 */

import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CollectionToolbar } from "./CollectionToolbar";
import { DEFAULT_COLLECTION_VIEW } from "./types";

/** Значення атрибута без огляду на регістр: у HTML імена не регістрозалежні. */
function attribute(element: Element, name: string): string | null {
  const wanted = name.toLowerCase();
  const found = [...element.attributes].find((item) => item.name.toLowerCase() === wanted);
  return found?.value ?? null;
}

function renderToolbar(query = "", onQueryChange = vi.fn()) {
  render(
    <CollectionToolbar
      query={query}
      onQueryChange={onQueryChange}
      searchLabel="Пошук за текстом"
      pickers={[
        {
          key: "sort",
          label: "Порядок",
          icon: "arrow-down",
          value: "Спочатку нові",
          items: [{ key: "new", label: "Спочатку нові", onSelect: vi.fn() }],
        },
      ]}
      view={DEFAULT_COLLECTION_VIEW}
      onViewChange={() => {}}
      toggleAll={{ open: false, onToggle: () => {}, what: "нотатки" }}
      add={{ label: "Нова нотатка", onClick: () => {} }}
      chips={[{ key: "tag", label: "#сон", action: "Прибрати тег", onClear: () => {} }]}
      filtered={{ shown: 2, total: 5 }}
    />,
  );
  return { input: screen.getByRole("searchbox") as HTMLInputElement, onQueryChange };
}

describe("CollectionToolbar — поле пошуку", () => {
  it("питає клавіатуру телефона про «Знайти», а не про «Ввести»", () => {
    const { input } = renderToolbar();
    expect(attribute(input, "enterKeyHint")).toBe("search");
  });

  it("не віддає запит словнику: без автопідказок, автозаголовків і орфографії", () => {
    const { input } = renderToolbar();
    expect(attribute(input, "autoComplete")).toBe("off");
    expect(attribute(input, "autoCorrect")).toBe("off");
    expect(attribute(input, "spellCheck")).toBe("false");
  });

  it("вводить у поле й віддає запит екранові", () => {
    const { input, onQueryChange } = renderToolbar();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "сон" } });
    fireEvent.blur(input);
    expect(onQueryChange).toHaveBeenCalledWith("сон");
  });

  it("прибирає запит своєю ✕, а не нативною коробкою WebView", () => {
    // Порожнє поле не має кнопки очищення: прибирати нічого.
    renderToolbar();
    expect(screen.queryByRole("button", { name: "Прибрати пошук" })).toBeNull();
    cleanup();

    const { onQueryChange } = renderToolbar("сон");
    fireEvent.click(screen.getByRole("button", { name: "Прибрати пошук" }));
    expect(onQueryChange).toHaveBeenCalledWith("");
  });
});

describe("CollectionToolbar — вибори й чипи", () => {
  it("вибір відкривається поверхнею й закривається, коли його зроблено", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: /Порядок/ }));

    const picker = screen.getByRole("dialog", { name: "Порядок" });
    fireEvent.click(within(picker).getByText("Спочатку нові"));
    expect(screen.queryByRole("dialog", { name: "Порядок" })).toBeNull();
  });

  it("чип вибраного стоїть окремим рядком і знімається дотиком", () => {
    renderToolbar();
    expect(screen.getByText("#сон")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Прибрати тег" })).toBeTruthy();
  });

  it("звужений список каже, скільки видно", () => {
    renderToolbar();
    // «2 з 5» — різниця, а не два числа поруч: інакше підпис нічого не каже.
    expect(screen.getByText(/2[^\d]{0,12}5/)).toBeTruthy();
  });
});
