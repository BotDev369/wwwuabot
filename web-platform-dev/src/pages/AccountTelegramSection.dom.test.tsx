// @vitest-environment jsdom
/**
 * Публічність у розділі «Телеграм»: дотик зберігається, а відмова називає причину.
 *
 * Тут ламається мовчки: досить віддати на сервер неповний набір полів — і
 * людина вмикає профіль, а половина полів лишається закритою; досить змінити
 * стан до відповіді сервера — і перемикач обіцяє те, чого не зберіглося;
 * досить проковтнути помилку — і екран виглядає так, ніби все гаразд.
 *
 * @module web-platform-dev/src/pages/AccountTelegramSection.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_OPEN_FIELDS, type UserProfileData } from "@wwwuabot/shared";

const alert = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ alert, confirm: vi.fn(), prompt: vi.fn() }),
}));

const { AccountTelegramSection } = await import("./AccountTelegramSection");

const USER: UserProfileData = {
  id: 42,
  telegram: { id: 372567448, first_name: "Сергій", username: "DiskantSergiy" },
};

const MAIN = "Публічний профіль";

const save = (failure: string | null = null) => vi.fn(async () => failure);

beforeEach(() => {
  alert.mockClear();
});

describe("збереження публічності", () => {
  it("увімкнення профілю віддає повний набір полів", async () => {
    const onChangeVisibility = save();
    render(<AccountTelegramSection user={USER} onChangeVisibility={onChangeVisibility} />);

    await userEvent.click(screen.getByRole("switch", { name: MAIN }));

    expect(onChangeVisibility).toHaveBeenCalledWith({
      isPublic: true,
      fields: DEFAULT_OPEN_FIELDS,
    });
    expect(alert).not.toHaveBeenCalled();
  });

  it("поле відкривається, а решта лишається відкритою", async () => {
    const onChangeVisibility = save();
    render(
      <AccountTelegramSection
        user={{ ...USER, isPublic: true, openFields: ["about"] }}
        onChangeVisibility={onChangeVisibility}
      />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "Роль" }));

    expect(onChangeVisibility).toHaveBeenCalledWith({ isPublic: true, fields: ["about", "role"] });
  });

  it("відмова сервера називає причину діалогом", async () => {
    const onChangeVisibility = save("Немає зв'язку");
    render(<AccountTelegramSection user={USER} onChangeVisibility={onChangeVisibility} />);

    await userEvent.click(screen.getByRole("switch", { name: MAIN }));

    await vi.waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Немає зв'язку", {
        tone: "danger",
        title: "Не збереглося",
      }),
    );
  });
});
