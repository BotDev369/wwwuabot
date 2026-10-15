// @vitest-environment jsdom
/**
 * Публічність профілю — один перемикач, а поля під ним.
 *
 * Тут ламається мовчки: досить показати поля, поки профіль закритий, — і людина
 * бачить вісім перемикачів, які зараз ні на що не впливають; досить віддати
 * новий стан без решти відкритих полів — і друге поле вимикається саме; досить
 * зберегти порядок, у якому набір прийшов із бази, — і перемикачі щоразу стоять
 * на новому місці.
 *
 * Компонент нічого не зберігає, тож перевіряється саме те, що він віддає назовні:
 * повний набір полів і `isPublic` — те, що екран потім надсилає на сервер.
 *
 * @module @wwwuabot/shared/components/user-profile/PublicProfileControls.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PUBLIC_FIELD_LABELS,
  PUBLIC_PROFILE_FIELDS,
  type PublicProfileField,
} from "../../user/public-profile";
import { PublicProfileControls } from "./PublicProfileControls";

const MAIN = "Публічний профіль";

/** Малює кирпичик і повертає те, чим екран відповідає на дотик. */
function renderControls(
  isPublic: boolean,
  openFields: readonly PublicProfileField[] = [],
  disabled = false,
): ReturnType<typeof vi.fn> {
  const onChange = vi.fn();
  render(
    <PublicProfileControls
      isPublic={isPublic}
      openFields={openFields}
      disabled={disabled}
      onChange={onChange}
    />,
  );
  return onChange;
}

/** Перемикач за підписом: саме так його знаходить і людина, і скрінрідер. */
const switchNamed = (label: string): HTMLElement => screen.getByRole("switch", { name: label });

describe("перемикачі публічності", () => {
  it("каже другим рядком, що означає головний перемикач", () => {
    renderControls(false);

    expect(switchNamed(MAIN).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Вас видно іншим")).toBeTruthy();
  });

  it("⛔ закритий профіль не показує перемикачів полів", () => {
    renderControls(false);

    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.queryByRole("switch", { name: PUBLIC_FIELD_LABELS.role })).toBeNull();
  });

  it("відкритий профіль показує всі поля, і відкриті — увімкненими", () => {
    renderControls(true, ["about"]);

    expect(screen.getAllByRole("switch")).toHaveLength(1 + PUBLIC_PROFILE_FIELDS.length);
    expect(switchNamed(PUBLIC_FIELD_LABELS.about).getAttribute("aria-checked")).toBe("true");
    expect(switchNamed(PUBLIC_FIELD_LABELS.role).getAttribute("aria-checked")).toBe("false");
  });

  it("увімкнення профілю не чіпає полів, які вже відкрито", async () => {
    const onChange = renderControls(false, ["about"]);

    await userEvent.click(switchNamed(MAIN));

    expect(onChange).toHaveBeenCalledWith({ isPublic: true, fields: ["about"] });
  });

  it("поле відкривається, а решта лишається відкритою", async () => {
    const onChange = renderControls(true, ["about"]);

    await userEvent.click(switchNamed(PUBLIC_FIELD_LABELS.role));

    expect(onChange).toHaveBeenCalledWith({ isPublic: true, fields: ["about", "role"] });
  });

  it("закрите поле закривають тим самим дотиком", async () => {
    const onChange = renderControls(true, ["about", "role"]);

    await userEvent.click(switchNamed(PUBLIC_FIELD_LABELS.about));

    expect(onChange).toHaveBeenCalledWith({ isPublic: true, fields: ["role"] });
  });

  it("порядок полів канонічний, а не той, у якому набір прийшов із бази", async () => {
    const onChange = renderControls(true, ["status", "platformUsername"]);

    await userEvent.click(switchNamed(PUBLIC_FIELD_LABELS.photo));

    expect(onChange).toHaveBeenCalledWith({
      isPublic: true,
      fields: ["platformUsername", "photo", "status"],
    });
  });

  it("поки стан зберігається, перемикачі не тиснуться", async () => {
    const onChange = renderControls(true, ["about"], true);

    await userEvent.click(switchNamed(MAIN));

    expect(onChange).not.toHaveBeenCalled();
  });
});
