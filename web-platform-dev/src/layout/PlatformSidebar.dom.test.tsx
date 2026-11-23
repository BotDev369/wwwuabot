// @vitest-environment jsdom
/**
 * Сайдбар платформи бере пункти з реєстру: підпис, знак і адреса — з рядків, а
 * не з другого списку в коді. Тому його й перевіряємо на штучному реєстрі.
 *
 * @module web-platform-dev/src/layout/PlatformSidebar.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ScreenRow } from "@wwwuabot/shared/screens";
import { PlatformSidebar } from "./PlatformSidebar";
import { navFromScreens } from "./screen-nav";

const row = (over: Partial<ScreenRow> & Pick<ScreenRow, "key" | "title">): ScreenRow => ({
  parentKey: null,
  icon: "home",
  sortOrder: 0,
  inMenu: true,
  texts: {},
  ...over,
});

const ROWS: ScreenRow[] = [
  row({ key: "account", title: "Акаунт", icon: "user", sortOrder: 20 }),
  row({ key: "analysis", title: "Аналіз", icon: "grid", sortOrder: 40 }),
  row({ key: "trackers", title: "Трекери", icon: "bar-chart", sortOrder: 10 }),
  // Не в меню — у сайдбар не потрапляє.
  row({ key: "shops", title: "Крамниці", inMenu: false }),
  // Пункт без знака не малюється: знак — частина пункту, а не прикраса.
  row({ key: "notes", title: "Нотатки", icon: null, sortOrder: 30 }),
];

describe("navFromScreens", () => {
  it("бере лише пункти меню, тематичними групами, без пунктів без знака", () => {
    const sections = navFromScreens(ROWS, "/trackers");

    expect(sections.map((section) => section.key)).toEqual(["everyday", "cabinet"]);
    // Підписів груп у меню немає: як і на головній, групу читає сам блок.
    expect(sections.every((section) => section.title === undefined)).toBe(true);
    // Група тримає свій порядок із `menu-groups.json`, а не `sort_order`.
    expect(sections[0].items.map((item) => item.key)).toEqual(["analysis", "trackers"]);
    // «Акаунт» стоїть у "Кабінеті", а «Нотатки» без знака не малюються взагалі.
    expect(sections[1].items.map((item) => item.key)).toEqual(["account"]);
    expect(sections[0].items[1].href).toBe("/trackers");
  });

  it("підсвічує корінь і його підсторінки, але не сусідній розділ", () => {
    const active = (pathname: string): string[] =>
      navFromScreens(ROWS, pathname)
        .flatMap((section) => section.items)
        .filter((item) => item.active)
        .map((i) => i.key);

    expect(active("/trackers")).toEqual(["trackers"]);
    // Підсторінка розділу світить його пункт.
    expect(active("/analysis/tests")).toEqual(["analysis"]);
    expect(active("/account")).toEqual(["account"]);
    // Адреса, якої немає в реєстрі, не підсвічує нічого.
    expect(active("/trackers/42")).toEqual([]);
    // Невідома адреса не підсвічує нічого: краще нічого, ніж не той пункт.
    expect(active("/unknown")).toEqual([]);
  });
});

function Location(): React.ReactElement {
  return <p>{useLocation().pathname}</p>;
}

describe("PlatformSidebar", () => {
  it("малює пункти з реєстру й закриває меню після переходу", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/trackers"]}>
        <PlatformSidebar screens={ROWS} pathname="/trackers" open onClose={onClose} />
        <Location />
      </MemoryRouter>,
    );

    expect(screen.getByText("Трекери")).toBeTruthy();
    expect(screen.queryByText("Крамниці")).toBeNull();

    fireEvent.click(screen.getByText("Акаунт"));

    expect(screen.getByText("/account")).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
