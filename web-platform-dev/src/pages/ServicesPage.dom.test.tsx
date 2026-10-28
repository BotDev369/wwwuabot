// @vitest-environment jsdom
/**
 * Екран «Сервіси»: список сервісів веде на **існуючі** екрани.
 *
 * Перевіряється той дрот, який ламається мовчки: кожен рядок даних мусить стати
 * кнопкою, а дотик — переходом саме туди, а не в нікуди.
 *
 * @module web-platform-dev/src/pages/ServicesPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import { ASSESSMENTS_PATH, TRACKERS_PATH } from "@/app/routes";
import { SERVICES } from "./services-list";

const hooks = { navigate: vi.fn(), dialog: { alert: vi.fn() } };

vi.mock("react-router-dom", () => ({ useNavigate: () => hooks.navigate }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => hooks.dialog }));

const { ServicesPage } = await import("./ServicesPage");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("список сервісів", () => {
  it("кожен сервіс — окрема кнопка зі своїм підписом", () => {
    render(<ServicesPage />);

    const labels = SERVICES.map((service) => service.label);
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("дотик веде на адресу сервісу", async () => {
    render(<ServicesPage />);

    const first = SERVICES[0];
    await userEvent.click(screen.getByRole("button", { name: first.label }));

    expect(hooks.navigate).toHaveBeenCalledWith(first.to);
  });

  it("адреси не повторюються — інакше два пункти ведуть в одне місце", () => {
    const paths = SERVICES.map((service) => service.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  // Трекери й розвиток мають власний пункт футера: рядок у списку був би
  // другим входом у той самий екран (аналіз дат — частина «Розвитку»).
  it("не дублює те, що вже стоїть у футері", () => {
    const paths = SERVICES.map((service) => service.to);
    expect(paths).not.toContain(TRACKERS_PATH);
    expect(paths).not.toContain(ASSESSMENTS_PATH);
    expect(paths).not.toContain(DATE_ANALYSIS_PATH);
  });
});
