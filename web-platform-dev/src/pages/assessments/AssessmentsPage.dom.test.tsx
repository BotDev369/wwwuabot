// @vitest-environment jsdom
/**
 * «Розвиток» — один екран на два входи: аналіз дат і тести.
 *
 * Перевіряється те, що ламається мовчки: аналіз дат веде на **свій** екран
 * (він не розкривається тут уривком), а кожна картка тесту відкриває саме
 * свій тест, а не перший зі списку.
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
  it("аналіз дат веде на власний екран, а не показується тут", async () => {
    const onOpenDates = vi.fn();
    page({ onOpenDates });

    expect(screen.getByRole("heading", { name: "Аналіз дат" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));

    expect(onOpenDates).toHaveBeenCalledTimes(1);
  });

  it("кожен тест — окрема картка, і її кнопка відкриває саме цей тест", async () => {
    const onOpen = vi.fn();
    page({ onOpen });

    for (const test of ASSESSMENTS) {
      expect(screen.getByRole("heading", { name: test.title })).toBeTruthy();
    }

    // Ще не проходили — кнопка каже «Пройти», і її підпис не залежить від тесту.
    const buttons = screen.getAllByRole("button", { name: "Пройти" });
    expect(buttons).toHaveLength(ASSESSMENTS.length);
    await userEvent.click(buttons[1]);

    expect(onOpen).toHaveBeenCalledWith(ASSESSMENTS[1].key);
  });
});
