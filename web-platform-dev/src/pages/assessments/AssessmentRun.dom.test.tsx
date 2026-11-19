// @vitest-environment jsdom
/**
 * Проходження — одне питання на екран — і **вихід у профіль**, а не в той
 * самий список.
 *
 * Ламається мовчки: кнопка «далі» без відповіді мусить мовчати; після
 * останнього питання мусить бути результат, а не шосте питання; посилання
 * результату мусить вести туди, куди його попросив екран-власник.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentRun.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { getAssessment, type AssessmentRecord } from "@wwwuabot/shared/assessments";
import { AssessmentRun } from "./AssessmentRun";

const test = getAssessment("who5")!;

function record(): AssessmentRecord {
  return {
    id: 1,
    testKey: test.key,
    scaleKey: test.scales[0].key,
    answers: test.items.map(() => 4),
    raw: 20,
    percent: 80,
    bandKey: "high",
    needsAttention: false,
    createdAt: "2026-11-19 10:00:00",
  };
}

function renderRun(resultHref = "/analysis/person/result?dates=1980-03-03&survey=1"): void {
  render(
    <MemoryRouter>
      <AssessmentRun
        test={test}
        history={[]}
        peers={{}}
        saving={false}
        error={null}
        submit={vi.fn(async () => [record()])}
        onDone={vi.fn()}
        resultHref={resultHref}
        resultLabel="До мого профілю"
      />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("проходження тесту", () => {
  it("іде по одному питанню й після останнього показує результат із профілем", async () => {
    const submit = vi.fn(async () => [record()]);
    render(
      <MemoryRouter>
        <AssessmentRun
          test={test}
          history={[]}
          peers={{}}
          saving={false}
          error={null}
          submit={submit}
          onDone={vi.fn()}
          resultHref="/analysis/person/result?dates=1980-03-03&survey=1"
          resultLabel="До мого профілю"
        />
      </MemoryRouter>,
    );

    for (let step = 0; step < test.items.length; step += 1) {
      expect(screen.getByText(`${step + 1} / ${test.items.length}`)).toBeTruthy();
      const group = screen.getByRole("group", { name: test.items[step].text });
      await userEvent.click(within(group).getAllByRole("button")[3]);

      const button = screen.getByRole("button", {
        name: step === test.items.length - 1 ? "Показати результат" : "Далі",
      });
      await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
      await userEvent.click(button);
    }

    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "До мого профілю" }).getAttribute("href")).toBe(
      "/analysis/person/result?dates=1980-03-03&survey=1",
    );
  });

  it("без відповіді кнопка «далі» неактивна", () => {
    renderRun();

    const button = screen.getByRole("button", { name: "Далі" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("«ще раз» повертає на перше питання", async () => {
    renderRun();
    for (let step = 0; step < test.items.length; step += 1) {
      const group = screen.getByRole("group", { name: test.items[step].text });
      await userEvent.click(within(group).getAllByRole("button")[3]);
      await userEvent.click(
        screen.getByRole("button", {
          name: step === test.items.length - 1 ? "Показати результат" : "Далі",
        }),
      );
    }

    await userEvent.click(screen.getByRole("button", { name: "Ще раз" }));
    expect(screen.getByText(`1 / ${test.items.length}`)).toBeTruthy();
  });
});
