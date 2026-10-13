// @vitest-environment jsdom
/**
 * «Ігри» — список і партія.
 *
 * Ламається мовчки: досить перестати малювати пункт на кожну гру — і гра стає
 * недосяжною; досить мовчати на невідомий ключ — і `/games/шахи` показує
 * порожній екран замість «такої гри немає»; досить загубити список — і «назад» із
 * партії не має куди вертати.
 *
 * @module web-platform-dev/src/pages/games/GamesPage.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GAMES } from "./games";
import { GamePage } from "./GamePage";
import { GamesList } from "./GamesList";
import { GamesPage } from "./GamesPage";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

const renderList = (): void => {
  render(
    <MemoryRouter>
      <GamesList />
    </MemoryRouter>,
  );
};

const renderGame = (key: string): void => {
  render(
    <MemoryRouter initialEntries={[`/games/${key}`]}>
      <Routes>
        <Route path="/games/:key" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("список ігор", () => {
  it("кожна гра — окремий пункт зі своїм підписом", () => {
    renderList();

    for (const game of GAMES) {
      expect(screen.getByRole("button", { name: game.label })).toBeTruthy();
    }
  });

  it("екран «Ігри» малює саме список, а не дошку", () => {
    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: GAMES[0].label })).toBeTruthy();
  });

  it("пошук звужує список, а звужений у нуль каже про це", async () => {
    renderList();

    const search = screen.getByRole("searchbox", { name: "Пошук за назвою гри" });
    await userEvent.type(search, GAMES[0].label);
    expect(screen.getByRole("button", { name: GAMES[0].label })).toBeTruthy();
    expect(screen.queryByRole("button", { name: GAMES[1].label })).toBeNull();

    await userEvent.type(search, " такого нема");
    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
  });
});

describe("партія", () => {
  it("невідомий ключ каже, що гри немає, і дає кнопку до списку", () => {
    renderGame("шахи");

    expect(screen.getByText("Такої гри немає.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "До всіх ігор" })).toBeTruthy();
  });

  it("відома гра відкриває свій екран із назвою", () => {
    renderGame(GAMES[0].key);

    expect(screen.getAllByText(GAMES[0].label).length).toBeGreaterThan(0);
  });
});
