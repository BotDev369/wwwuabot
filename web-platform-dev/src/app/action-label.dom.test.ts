// @vitest-environment jsdom
/**
 * Дія → підпис у журналі: те, що читає людина (`aria-label`, `title`, текст),
 * назва поля й уведене значення. Порожнє місце й секрет у журнал не йдуть.
 *
 * @module web-platform-dev/src/app/action-label.dom.test
 */

import { describe, expect, it } from "vitest";
import { GESTURE_LABEL_MAX, GESTURE_VALUE_MAX, choiceOf, entryOf, gestureOf } from "./action-label";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe("натискання", () => {
  it("називає кнопку її текстом", () => {
    expect(gestureOf(mount("<button>Додати</button>"))).toEqual({ label: "Додати" });
  });

  it("явний підпис важливіший за текст усередині", () => {
    expect(gestureOf(mount('<button aria-label="Додати трекер">+</button>'))?.label).toBe(
      "Додати трекер",
    );
  });

  it("дотик по іконці всередині кнопки — це дотик по кнопці", () => {
    const button = mount("<button><span>Обране</span></button>");

    expect(gestureOf(button.querySelector("span"))).toEqual({ label: "Обране" });
  });

  it("вид контрола в журнал не потрапляє: це мова розмітки", () => {
    expect(gestureOf(mount('<div role="tab">Бот</div>'))).toEqual({ label: "Бот" });
    expect(gestureOf(mount('<a href="/notes">Нотатки</a>'))).toEqual({ label: "Нотатки" });
  });

  it("картка не-кнопка теж стає рядком — зі своїм текстом", () => {
    expect(gestureOf(mount("<div class='card'>Кава вдома</div>"))).toEqual({ label: "Кава вдома" });
  });

  it("порожнє місце не пише нічого", () => {
    expect(gestureOf(mount("<div></div>"))).toBeNull();
    expect(gestureOf(null)).toBeNull();
  });

  it("закриття поверхні не пишеться — це вихід, а не дія", () => {
    expect(gestureOf(mount('<button aria-label="Закрити">✕</button>'))).toBeNull();
    expect(gestureOf(mount('<button aria-label="Закрити меню">✕</button>'))).toBeNull();
    expect(gestureOf(mount("<button>Закрити</button>"))).toBeNull();
    // Дія, яка лише звучить схоже, лишається: «Зберегти» — не вихід.
    expect(gestureOf(mount("<button>Зберегти</button>"))).toEqual({ label: "Зберегти" });
  });

  it("довгий текст обрізається: журнал описує дотик, а не картку цілком", () => {
    const label = gestureOf(mount(`<button>${"я".repeat(GESTURE_LABEL_MAX + 20)}</button>`))?.label;

    expect(label).toHaveLength(GESTURE_LABEL_MAX);
    expect(label?.endsWith("…")).toBe(true);
  });
});

describe("вибір у полі", () => {
  it("список називає обране значення, а поле — окремо", () => {
    const select = mount(
      '<select aria-label="Одиниця"><option>л</option><option selected>мл</option></select>',
    );

    expect(choiceOf(select)).toEqual({ label: "мл", field: "Одиниця" });
  });

  it("назва поля береться з його <label>", () => {
    const field = mount(
      '<label>Публічний профіль<input type="checkbox" checked /></label>',
    ).querySelector("input");

    expect(choiceOf(field)).toEqual({ label: "увімкнено", field: "Публічний профіль" });
  });

  it("текстове поле — не вибір: його пише `entryOf`", () => {
    expect(choiceOf(mount('<input aria-label="Назва" value="таємне" />'))).toBeNull();
  });

  it("не-поле не є вибором", () => {
    expect(choiceOf(mount("<button>Додати</button>"))).toBeNull();
  });
});

describe("уведений текст", () => {
  it("пише значення й назву поля", () => {
    const field = mount('<input aria-label="Назва" />') as HTMLInputElement;
    field.value = "купити хліб";

    expect(entryOf(field)).toEqual({ label: "купити хліб", field: "Назва" });
  });

  it("назва поля береться й зі сусіднього `<label for>`", () => {
    const container = mount(
      '<div><label for="note">Нотатка</label><textarea id="note"></textarea></div>',
    );
    const field = container.querySelector("textarea") as HTMLTextAreaElement;
    field.value = "купити хліб";

    expect(entryOf(field)).toEqual({ label: "купити хліб", field: "Нотатка" });
  });

  it("порожнє поле не подія", () => {
    expect(entryOf(mount('<input aria-label="Назва" value="  " />'))).toBeNull();
  });

  it("секрет і файл не копіюються ніколи", () => {
    expect(
      entryOf(mount('<input type="password" aria-label="Пароль" value="secret" />')),
    ).toBeNull();
    expect(entryOf(mount('<input type="file" aria-label="Фото" />'))).toBeNull();
  });

  it("довгий текст обрізається до межі значення", () => {
    const field = mount('<textarea aria-label="Текст"></textarea>') as HTMLTextAreaElement;
    field.value = "я".repeat(GESTURE_VALUE_MAX + 20);

    expect(entryOf(field)?.label).toHaveLength(GESTURE_VALUE_MAX);
  });
});
