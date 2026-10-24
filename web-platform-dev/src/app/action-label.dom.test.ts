// @vitest-environment jsdom
/**
 * Дотик → підпис у журналі: те, що читає людина (`aria-label`, `title`, текст)
 * і вид контрола. Порожнє місце в журнал не йде: це фон, а не дія.
 *
 * @module web-platform-dev/src/app/action-label.dom.test
 */

import { describe, expect, it } from "vitest";
import { GESTURE_LABEL_MAX, choiceOf, gestureOf } from "./action-label";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe("дотик", () => {
  it("називає кнопку її текстом", () => {
    expect(gestureOf(mount("<button>Додати</button>"))).toEqual({
      label: "Додати",
      target: "кнопка",
    });
  });

  it("явний підпис важливіший за текст усередині", () => {
    expect(gestureOf(mount('<button aria-label="Додати трекер">+</button>'))?.label).toBe(
      "Додати трекер",
    );
  });

  it("дотик по іконці всередині кнопки — це дотик по кнопці", () => {
    const button = mount("<button><span>Обране</span></button>");

    expect(gestureOf(button.querySelector("span"))).toEqual({
      label: "Обране",
      target: "кнопка",
    });
  });

  it("вкладка й посилання мають свій вид", () => {
    expect(gestureOf(mount('<div role="tab">Бот</div>'))?.target).toBe("вкладка");
    expect(gestureOf(mount('<a href="/notes">Нотатки</a>'))?.target).toBe("посилання");
  });

  it("картка не-кнопка теж стає рядком — зі своїм текстом", () => {
    expect(gestureOf(mount("<div class='card'>Кава вдома</div>"))).toEqual({
      label: "Кава вдома",
      target: "div",
    });
  });

  it("порожнє місце не пише нічого", () => {
    expect(gestureOf(mount("<div></div>"))).toBeNull();
    expect(gestureOf(null)).toBeNull();
  });

  it("довгий текст обрізається: журнал описує дотик, а не картку цілком", () => {
    const label = gestureOf(mount(`<button>${"я".repeat(GESTURE_LABEL_MAX + 20)}</button>`))?.label;

    expect(label).toHaveLength(GESTURE_LABEL_MAX);
    expect(label?.endsWith("…")).toBe(true);
  });
});

describe("вибір у полі", () => {
  it("список називає обраний варіант", () => {
    const select = mount(
      '<select aria-label="Одиниця"><option>л</option><option selected>мл</option></select>',
    );

    expect(choiceOf(select)).toEqual({ label: "Одиниця: мл", target: "поле" });
  });

  it("підпис поля береться з його <label>", () => {
    const field = mount(
      '<label>Публічний профіль<input type="checkbox" checked /></label>',
    ).querySelector("input");

    expect(choiceOf(field)?.label).toBe("Публічний профіль: увімкнено");
  });

  it("введений текст у журнал не копіюється", () => {
    expect(choiceOf(mount('<input aria-label="Назва" value="таємне" />'))?.label).toBe("Назва");
  });

  it("не-поле не є вибором", () => {
    expect(choiceOf(mount("<button>Додати</button>"))).toBeNull();
  });
});
