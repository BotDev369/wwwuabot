// @vitest-environment jsdom
/**
 * Картка результату й блок шкали — те, що видно після «Показати результат».
 *
 * Тест з'явився разом із перейменуванням класів (`wb-profile*` → `wb-spread*`,
 * `wb-about*` → `wb-result-about*`): той клас обліплював блок результату чужою
 * карткою акаунта, і побачити це можна було лише на телефоні. Тут перевіряється
 * те, що ламається мовчки:
 *
 *  1. **Бал належить своїй шкалі** — у тесті з двома шкалами два блоки, і кожен
 *     каже свій бал зі своїм знаменником.
 *  2. **Розкид по сферах іде від відповідей**, а не від балу: найсильніша й
 *     найслабша сфера — різні речення.
 *  3. **Довідка закрита**, але містить джерело: атрибуція потрібна, а на
 *     першому екрані вона не потрібна.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentResultCard.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getAssessment, type AssessmentRecord } from "@wwwuabot/shared/assessments";
import { AssessmentResultCard } from "./AssessmentResultCard";

function record(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: 1,
    testKey: "who5",
    scaleKey: "wellbeing",
    answers: [5, 5, 5, 5, 5],
    raw: 25,
    percent: 100,
    bandKey: "high",
    needsAttention: false,
    createdAt: "2026-10-20 10:00:00",
    ...overrides,
  };
}

const who5 = getAssessment("who5")!;
const mood = getAssessment("mood-anxiety")!;

describe("картка результату", () => {
  it("показує бал шкали зі знаменником і смугу", () => {
    render(
      <AssessmentResultCard
        test={who5}
        records={[record()]}
        history={[]}
        peers={{ wellbeing: {} }}
      />,
    );

    expect(screen.getByRole("heading", { name: who5.scales[0].title })).toBeTruthy();
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("з 25")).toBeTruthy();
    // Смуга називає себе словом; те саме слово трапляється і в розкиді по сферах.
    expect(screen.getAllByText(/Високе/).length).toBeGreaterThan(0);
  });

  it("розкид по сферах іде від відповідей, а не від балу", () => {
    // Різні відповіді дають різні найсильнішу й найслабшу сферу: з однаковими
    // п'ятірками другого речення немає взагалі.
    render(
      <AssessmentResultCard
        test={who5}
        records={[record({ answers: [5, 4, 3, 5, 1], raw: 18, percent: 72, bandKey: "middle" })]}
        history={[]}
        peers={{ wellbeing: {} }}
      />,
    );

    expect(document.querySelectorAll(".wb-spread-line")).toHaveLength(2);
    // Питання до найслабшої сфери є саме тоді, коли сфери різняться: з
    // однаковими відповідями його немає (там працює гілка «все рівно»).
    expect(document.querySelector(".wb-spread-question")?.textContent).toBeTruthy();
  });

  it("довідка закрита за замовчуванням, але джерело в ній є", () => {
    const { container } = render(
      <AssessmentResultCard
        test={who5}
        records={[record()]}
        history={[]}
        peers={{ wellbeing: {} }}
      />,
    );

    const details = container.querySelector("details.wb-result-about");
    expect(details).toBeTruthy();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(details?.querySelector(".wb-result-about-chevron")).toBeTruthy();
    expect(container.querySelector(".wb-result-about-body a")?.getAttribute("href")).toMatch(
      /^https?:/,
    );
  });

  it("тренд з'являється лише тоді, коли є з чим порівнювати", () => {
    const { container, unmount } = render(
      <AssessmentResultCard
        test={who5}
        records={[record({ id: 2 })]}
        history={[]}
        peers={{ wellbeing: {} }}
      />,
    );
    expect(container.querySelector(".wb-trend")).toBeNull();
    unmount();

    render(
      <AssessmentResultCard
        test={who5}
        records={[record({ id: 2, raw: 20, percent: 80, bandKey: "high" })]}
        history={[record({ id: 1, raw: 12, percent: 48, bandKey: "low" })]}
        peers={{ wellbeing: {} }}
      />,
    );
    expect(document.querySelector(".wb-trend")?.textContent).toBeTruthy();
  });

  it("дві шкали — два блоки зі своїми балами", () => {
    // Відповіді — на **все** проходження (9 настрою + 7 тривоги + вплив), як їх
    // і зберігає база: бал шкали рахується з того самого масиву.
    const answers = [...Array<number>(9).fill(1), ...Array<number>(7).fill(2), 1];
    render(
      <AssessmentResultCard
        test={mood}
        records={[
          record({
            id: 3,
            testKey: "mood-anxiety",
            scaleKey: "mood",
            answers,
            raw: 9,
            percent: 33,
            bandKey: "phq_minimal",
          }),
          record({
            id: 4,
            testKey: "mood-anxiety",
            scaleKey: "anxiety",
            answers,
            raw: 14,
            percent: 66,
            bandKey: "gad_moderate",
          }),
        ]}
        history={[]}
        peers={{ mood: {}, anxiety: {} }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Настрій і депресія" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Тривога" })).toBeTruthy();
    expect(screen.getByText("з 27")).toBeTruthy();
    expect(screen.getByText("з 21")).toBeTruthy();
    // Спільний висновок — один на проходження, а не по одному на шкалу.
    expect(document.querySelectorAll(".wb-combined")).toHaveLength(1);
  });
});
