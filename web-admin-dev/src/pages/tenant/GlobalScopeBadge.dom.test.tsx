// @vitest-environment jsdom
/**
 * Підпис скоупу: глобальний екран не вдає, що показує дані проєкту.
 *
 * @module web-admin-dev/src/pages/tenant/GlobalScopeBadge.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

const { GlobalScopeBadge } = await import("./GlobalScopeBadge");

describe("підпис скоупу", () => {
  it("глобальний екран каже, що він про всю платформу", () => {
    render(<GlobalScopeBadge />);

    const badge = screen.getByText("Уся платформа");
    expect(badge.getAttribute("title")).toMatch(/не залежить від вибраного проєкту/);
  });

  it("профіль підписаний як особисте, а не проєктне", () => {
    render(<GlobalScopeBadge kind="personal" />);

    expect(screen.getByText("Особисте").getAttribute("title")).toMatch(/власний профіль/);
  });
});
