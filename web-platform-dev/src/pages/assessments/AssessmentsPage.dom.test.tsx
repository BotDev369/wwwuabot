// @vitest-environment jsdom
/**
 * «Розвиток» — список згорнутих акордеонів, а не карток із балами.
 *
 * Перевіряється те, що ламається мовчки: рядок типово **згорнутий** (тільки
 * знак і назва), розгортання дає опис і одну кнопку, а кожен рядок веде на
 * **свій** екран — аналіз дат на власний, тест на проходження саме цього тесту.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentsPage.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ASSESSMENTS } from "@wwwuabot/shared/assessments";
import { AssessmentsPage } from "./AssessmentsPage";

function page(props: { onOpen?: (key: string) => void; onOpenDates?: () => void } = {}) {
  return render(
    <AssessmentsPage
      tests={ASSESSMENTS}
      results={[]}
      loading={false}
      onOpen={props.onOpen ?? (() => {})}
      onOpenDates={props.onOpenDates ?? (() => {})}
    />,
  );
}

describe("екран «Розвиток»", () => {
  it("рядки згорнуті за замовчуванням: видно лише назву, без опису й кнопки", () => {
    page();

    for (const entry of ["Аналіз дат", ...ASSESSMENTS.map((test) => test.title)]) {
      expect(screen.getByRole("button", { name: entry }).getAttribute("aria-expanded")).toBe(
        "false",
      );
    }
    // Ні опису, ні дії: екран уміщається без прокрутки, а деталі живуть
    // усередині самого тесту.
    expect(screen.queryByRole("button", { name: "Відкрити" })).toBeNull();
    expect(screen.queryByText(ASSESSMENTS[0].lead)).toBeNull();
  });

  it("розгорнутий рядок показує опис і одну кнопку «Відкрити»", async () => {
    page();

    await userEvent.click(screen.getByRole("button", { name: ASSESSMENTS[0].title }));

    expect(
      screen.getByRole("button", { name: ASSESSMENTS[0].title }).getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText(ASSESSMENTS[0].lead)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Відкрити" })).toHaveLength(1);
  });

  it("кожен рядок веде на свій екран", async () => {
    const onOpen = vi.fn();
    const onOpenDates = vi.fn();
    page({ onOpen, onOpenDates });

    await userEvent.click(screen.getByRole("button", { name: "Аналіз дат" }));
    await userEvent.click(screen.getByRole("button", { name: ASSESSMENTS[1].title }));

    // Обидва рядки розгорнуті: кнопки йдуть у порядку списку.
    const openButtons = screen.getAllByRole("button", { name: "Відкрити" });
    expect(openButtons).toHaveLength(2);

    await userEvent.click(openButtons[0]);
    expect(onOpenDates).toHaveBeenCalledTimes(1);

    await userEvent.click(openButtons[1]);
    expect(onOpen).toHaveBeenCalledWith(ASSESSMENTS[1].key);
  });

  it("рядок пройденого тесту каже, коли проходили, але не показує бала", async () => {
    render(
      <AssessmentsPage
        tests={ASSESSMENTS}
        results={[
          {
            id: 1,
            testKey: "who5",
            scaleKey: "wellbeing",
            answers: [5, 5, 5, 5, 5],
            raw: 25,
            percent: 100,
            bandKey: "high",
            needsAttention: false,
            createdAt: "2026-09-20 10:00:00",
          },
        ]}
        loading={false}
        onOpen={() => {}}
        onOpenDates={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: ASSESSMENTS[0].title }));

    expect(screen.getByText(/востаннє 20\.09\.2026/)).toBeTruthy();
    // Бал без шкали, смуги й тренду читався б як вирок — його тут немає.
    expect(screen.queryByText("100%")).toBeNull();
    expect(screen.queryByText(/25 з 25/)).toBeNull();
  });
});
