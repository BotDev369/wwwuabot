// @vitest-environment jsdom
/**
 * Картка теми: на ній лише кольори, підпису й макета немає, дотик застосовує.
 *
 * Головна перевірка — та, на якій картка ламалась: **у межах теми всі зразки
 * різні**. Тому тест сам розв'язує `var()` із CSS і звіряє: зразків стільки,
 * скільки різних кольорів у теми, і жодна пара не має однакового значення.
 * Токен без правила в CSS або роль, якої немає в темі, теж валять тест.
 *
 * @module packages/shared/src/components/theme/ThemeCard.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { THEMES, themeById } from "../../styles/registry";
import palette from "../../styles/theme-palette.json";
import { themeSwatches, ThemeCard } from "./ThemeCard";

const styles = (file: string): string =>
  readFileSync(join(process.cwd(), "packages/shared/src/styles", file), "utf8");

const panel = styles("theme-panel.css");
const css = [styles("tokens.css"), styles("themes.css")].join("\n");

const paper = themeById("paper");
const ROLES = palette.roles as readonly string[];

/** Оголошення блока теми: ім'я без `--` → значення. */
function declarations(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1].slice(2), match[2].trim());
  }
  return map;
}

/** Значення токена з розв'язаними `var()` — інакше `--bg-1` і `--bg-0` різні. */
function resolve(decls: Map<string, string>, name: string, depth = 0): string {
  const raw = decls.get(name);
  if (raw === undefined) throw new Error(`немає --${name}`);
  if (depth > 8) throw new Error(`--${name}: var() зациклився`);

  const link = raw.match(/^var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)$/);
  if (!link) return raw.replace(/\s+/g, "").toLowerCase();
  return decls.has(link[1].slice(2))
    ? resolve(decls, link[1].slice(2), depth + 1)
    : (link[2] ?? "").replace(/\s+/g, "").toLowerCase();
}

/** Кольори кожної теми: ідентифікатор → колір на кожну роль. */
const colours = new Map<string, Map<string, string>>();
for (const match of css.matchAll(
  /(:root,\s*\[data-theme="light"\]|\[data-theme="([a-z-]+)"\])\s*\{([\s\S]*?)\n\}/g,
)) {
  const decls = declarations(match[3]);
  const byRole = new Map<string, string>();
  for (const role of ROLES) byRole.set(role, resolve(decls, role));
  colours.set(match[2] ?? "light", byRole);
}

describe("ThemeCard", () => {
  it("ставить палітру своєї теми на картку", () => {
    const { container } = render(<ThemeCard theme={paper} onApply={() => {}} />);

    expect(container.querySelector(".wb-theme-card")?.getAttribute("data-theme")).toBe("paper");
  });

  it("не показує ні назви, ні опису — вигляд і є доказом", () => {
    render(<ThemeCard theme={paper} onApply={() => {}} />);

    expect(screen.queryByText("Папір")).toBeNull();
    expect(screen.queryByText(paper.hint)).toBeNull();
  });

  it("показує зразки своєї теми, а не спільний список", () => {
    const { container } = render(<ThemeCard theme={paper} onApply={() => {}} />);
    const chips = [...container.querySelectorAll(".wb-theme-card-chip")];

    expect(chips.map((chip) => chip.className)).toEqual(
      themeSwatches("paper").map((token) => `wb-theme-card-chip wb-theme-card-chip--${token}`),
    );
  });

  it("не повторює колір: у кожній темі всі зразки різні", () => {
    for (const [id, byRole] of colours) {
      const values = themeSwatches(id).map((role) => byRole.get(role));
      expect(new Set(values).size, `тема «${id}» має два зразки одного кольору`).toBe(
        values.length,
      );
    }
  });

  it("не губить жодного різного кольору теми", () => {
    for (const [id, byRole] of colours) {
      const all = new Set(ROLES.map((role) => byRole.get(role)));
      const shown = new Set(themeSwatches(id).map((role) => byRole.get(role)));

      expect([...shown].sort(), `тема «${id}»: не всі кольори показані`).toEqual([...all].sort());
    }
  });

  it("має палітру для кожної теми реєстру", () => {
    for (const theme of THEMES) expect(colours.has(theme.id), theme.id).toBe(true);
  });

  it("без палітри показує всі ролі, а не порожнечу", () => {
    expect(themeSwatches("no-such-theme")).toEqual(ROLES);
  });

  it("кожен зразок має правило з власним токеном", () => {
    for (const role of ROLES) {
      const rule = panel.match(
        new RegExp(`\\.wb-theme-card-chip--${role}\\s*\\{[^}]*background:\\s*var\\(--${role}\\)`),
      );
      expect(rule, `.wb-theme-card-chip--${role} без background: var(--${role})`).not.toBeNull();
    }
  });

  it("не малює макета екрана: ні рядків, ні діаграми, ні дій", () => {
    const { container } = render(<ThemeCard theme={paper} onApply={() => {}} />);

    for (const dead of ["line", "sheet", "scene", "action", "dot", "bar", "swatch"]) {
      expect(
        container.querySelector(`.wb-theme-card-${dead}`),
        `.wb-theme-card-${dead}`,
      ).toBeNull();
    }
  });

  it("називає тему для читача екрана й каже, чи вона обрана", () => {
    render(<ThemeCard theme={paper} applied onApply={() => {}} />);

    const button = screen.getByRole("button", { name: "Тема «Папір»" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector(".wb-theme-card-on")).not.toBeNull();
  });

  it("необрана картка не має позначки", () => {
    render(<ThemeCard theme={paper} onApply={() => {}} />);

    const button = screen.getByRole("button", { name: "Тема «Папір»" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.querySelector(".wb-theme-card-on")).toBeNull();
  });

  it("дотик застосовує тему", () => {
    const onApply = vi.fn();
    render(<ThemeCard theme={paper} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Тема «Папір»" }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
