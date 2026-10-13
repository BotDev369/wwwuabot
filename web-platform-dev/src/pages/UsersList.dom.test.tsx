// @vitest-environment jsdom
/**
 * «Користувачі» — список людей, які самі відкрили профіль.
 *
 * Тут ламається мовчки: досить перестати показувати причину порожнечі — і екран
 * читається як поламаний; досить загубити кнопку повтору — і помилка стає глухим
 * кутом; досить забути, що пошук може звузити все — і «нічого не знайдено»
 * виглядало б як порожній список.
 *
 * @module web-platform-dev/src/pages/UsersList.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicProfile } from "@wwwuabot/shared";
import { UsersList } from "./UsersList";

const person = (id: number, platformUsername: string): PublicProfile => ({ id, platformUsername });

const noop = (): void => {};

describe("список людей", () => {
  it("показує картку кожного, хто відкрив профіль", () => {
    render(
      <UsersList
        items={[person(1, "olena"), person(2, "petro")]}
        loading={false}
        error={null}
        onRetry={noop}
      />,
    );

    expect(screen.getByText("#olena")).toBeTruthy();
    expect(screen.getByText("#petro")).toBeTruthy();
  });

  it("порожній список каже, **чому** тут порожньо", () => {
    render(<UsersList items={[]} loading={false} error={null} onRetry={noop} />);

    expect(screen.getByText(/Профіль з'являється/)).toBeTruthy();
  });

  it("завантаження не прикидається порожнім списком", () => {
    render(<UsersList items={[]} loading error={null} onRetry={noop} />);

    expect(screen.getByText(/Завантаження/)).toBeTruthy();
  });

  it("помилка називає причину й дає спробувати ще", async () => {
    const onRetry = vi.fn();
    render(<UsersList items={[]} loading={false} error="Немає доступу" onRetry={onRetry} />);

    expect(screen.getByText("Немає доступу")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Спробувати ще/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("пошук звужує список, а звужений у нуль каже про це", async () => {
    render(
      <UsersList
        items={[person(1, "olena"), person(2, "petro")]}
        loading={false}
        error={null}
        onRetry={noop}
      />,
    );

    const search = screen.getByRole("searchbox", { name: "Пошук за іменем або описом" });
    await userEvent.type(search, "olena");
    expect(screen.queryByText("#petro")).toBeNull();
    expect(screen.getByText("#olena")).toBeTruthy();

    await userEvent.type(search, " нема");
    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
  });
});
