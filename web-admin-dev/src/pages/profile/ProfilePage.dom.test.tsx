// @vitest-environment jsdom
/**
 * «Профіль»: сторінка рендерить дві секції й підписана як особисте.
 *
 * @module web-admin-dev/src/pages/profile/ProfilePage.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./AccountSection", () => ({ AccountSection: () => <div data-testid="account" /> }));
vi.mock("./UserLookupSection", () => ({
  UserLookupSection: () => <div data-testid="lookup" />,
}));

const { ProfilePage } = await import("./ProfilePage");

describe("ProfilePage", () => {
  it("показує обидві секції й підпис «Особисте»", () => {
    render(<ProfilePage />);

    expect(screen.getByTestId("account")).toBeTruthy();
    expect(screen.getByTestId("lookup")).toBeTruthy();
    expect(screen.getByText("Особисте")).toBeTruthy();
    expect(screen.queryByLabelText("Проєкт")).toBeNull();
  });
});
