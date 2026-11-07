// @vitest-environment jsdom
/**
 * Екран «Сервіси»: підписи приходять із рядка `scenarios`, а кожен рядок даних
 * веде на **існуючий** екран. Перевіряється той дріт, який ламається мовчки.
 *
 * @module web-platform-dev/src/pages/ServicesPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ScreenTexts } from "@wwwuabot/shared/screens";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import { ASSESSMENTS_PATH, TRACKERS_PATH } from "@/app/routes";
import { SERVICES, serviceGroupKey, serviceLabelKey } from "./services-list";

const hooks = { navigate: vi.fn(), dialog: { alert: vi.fn() } };

/** Ті самі ключі, що в рядку `services`: екран читає їх, а не літерали. */
const texts: ScreenTexts = {
  "services.title": "Сервіси",
  "services.group.community": "Спільнота",
  "services.group.content": "Контент",
  "services.group.personal": "Особисте",
  ...Object.fromEntries(SERVICES.map((service) => [serviceLabelKey(service.key), service.key])),
};

vi.mock("react-router-dom", () => ({ useNavigate: () => hooks.navigate }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => hooks.dialog }));
vi.mock("./screen-texts/useScreenTexts", () => ({
  useScreenTexts: () => ({ texts, ready: true }),
}));

const { ServicesPage } = await import("./ServicesPage");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("список сервісів", () => {
  it("кожен сервіс — окрема кнопка зі своїм підписом із бази", () => {
    render(<ServicesPage />);

    for (const service of SERVICES) {
      expect(screen.getByRole("button", { name: service.key })).toBeTruthy();
    }
  });

  it("групи стоять під своїми підписами", () => {
    render(<ServicesPage />);

    for (const group of new Set(SERVICES.map((service) => service.group))) {
      expect(screen.getByText(texts[serviceGroupKey(group)] ?? "")).toBeTruthy();
    }
  });

  it("дотик веде на адресу сервісу", async () => {
    render(<ServicesPage />);

    const first = SERVICES[0];
    await userEvent.click(screen.getByRole("button", { name: first.key }));

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
