// @vitest-environment jsdom
/**
 * Дія → рядок журналу: ім'я контрола й назва поля при виборі. Дотик по тексту
 * сторінки дією не є, введений текст не пишеться ніколи, а вихід («Закрити»,
 * «Назад») у журнал не потрапляє.
 *
 * @module web-platform-dev/src/app/action-label.dom.test
 */

import { describe, expect, it } from "vitest";
import { GESTURE_LABEL_MAX, choiceOf, gestureOf } from "./action-label";

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

  it("дотик по тексту сторінки — не дія", () => {
    // Повідомлення, емодзі, підпис — не контроли: саме вони давали рядки
    // «❤️❤️❤️» і «Ма-мі. Ви: Фото», які нічого не описували.
    expect(gestureOf(mount("<div class='card'>Кава вдома</div>"))).toBeNull();
    expect(gestureOf(mount("<p>❤️❤️❤️</p>"))).toBeNull();
    expect(gestureOf(null)).toBeNull();
  });

  it("порожній контрол не пише нічого", () => {
    expect(gestureOf(mount("<button></button>"))).toBeNull();
  });

  it("вихід не пишеться — це не дія", () => {
    for (const html of [
      '<button aria-label="Закрити">✕</button>',
      '<button aria-label="Закрити меню">✕</button>',
      "<button>Закрити</button>",
      "<button>Скасувати</button>",
      "<button>Назад</button>",
      '<button aria-label="Back">←</button>',
    ]) {
      expect(gestureOf(mount(html)), html).toBeNull();
    }
    // Дія, яка лише звучить схоже, лишається: «Зберегти» — не вихід.
    expect(gestureOf(mount("<button>Зберегти</button>"))).toEqual({ label: "Зберегти" });
  });

  it("явне ім'я розмітки заміняє злиплий текст картки", () => {
    const card = mount(
      '<button data-log="Настя"><span>1</span>Настя<span>21.09.2026</span>' +
        "<span>@nastyulyaa7</span><span>id 1090029614</span></button>",
    );

    expect(gestureOf(card)).toEqual({ label: "Настя" });
  });

  it('`data-log="-"` вимикає запис дотику', () => {
    expect(gestureOf(mount('<button data-log="-">Показати ще</button>'))).toBeNull();
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

  it("текстове поле — не вибір: набране не пишеться ніколи", () => {
    const field = mount('<input aria-label="Текст повідомлення" />') as HTMLInputElement;
    field.value = "Кукурудза 🌽";

    expect(choiceOf(field)).toBeNull();
  });

  it("не-поле не є вибором", () => {
    expect(choiceOf(mount("<button>Додати</button>"))).toBeNull();
  });
});
