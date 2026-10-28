// @vitest-environment jsdom
/**
 * Екран «Розвиток» веде **за адресою**, а не за станом.
 *
 * Перевіряється саме перехід: аналіз дат відкривається власною адресою, а тест —
 * адресою проходження, бо «назад» у Telegram мусить повертати на список, а не
 * виходити з розділу.
 *
 * @module web-platform-dev/src/pages/assessments/AssessmentsScreen.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ASSESSMENTS } from "@wwwuabot/shared/assessments";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), params: {} as { key?: string } }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("./useAssessments", () => ({
  useAssessments: () => ({
    tests: ASSESSMENTS,
    results: [],
    peers: [],
    loading: false,
    saving: false,
    error: null,
    submit: vi.fn(),
    clearError: vi.fn(),
  }),
}));

const { AssessmentsScreen } = await import("./AssessmentsScreen");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = {};
});

describe("екран «Розвиток»", () => {
  it("аналіз дат відкривається своєю адресою", async () => {
    render(<AssessmentsScreen />);

    await userEvent.click(screen.getByRole("button", { name: "Аналіз дат" }));
    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));

    expect(mocks.navigate).toHaveBeenCalledWith(DATE_ANALYSIS_PATH);
  });

  it("тест відкривається адресою проходження, а не залишається на місці", async () => {
    render(<AssessmentsScreen />);

    await userEvent.click(screen.getByRole("button", { name: ASSESSMENTS[0].title }));
    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));

    expect(mocks.navigate).toHaveBeenCalledWith(`/assessments/${ASSESSMENTS[0].key}`);
  });
});
