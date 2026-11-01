// @vitest-environment jsdom
/**
 * Галерея: зображення, підписи й сітка з CSS.
 * @module packages/ui/src/blocks/GalleryBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { GalleryBlock } from "./GalleryBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "gallery", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const IMAGES = [
  { src: "https://example.com/one.jpg", alt: "Перше", caption: "Опис" },
  { src: "https://example.com/two.jpg", alt: "Друге" },
];

describe("GalleryBlock", () => {
  it("без зображень нічого не малює", () => {
    const { container } = render(<GalleryBlock {...block({ images: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("малює всі знімки й підписує ті, у яких є підпис", () => {
    const { container } = render(<GalleryBlock {...block({ images: IMAGES })} />);

    expect(container.querySelectorAll(".wb-block-gallery__img")).toHaveLength(2);
    expect(screen.getByAltText("Перше")).toBeTruthy();
    expect(screen.getByText("Опис")).toBeTruthy();
  });

  it("сітку міряє CSS, а не число колонок із props", () => {
    const { container } = render(<GalleryBlock {...block({ images: IMAGES, columns: "4" })} />);
    const grid = container.querySelector(".wb-block-gallery") as HTMLElement;

    expect(grid.getAttribute("style")).toBeNull();
    expect(grid.className).toContain("wb-block-gallery");
  });
});
