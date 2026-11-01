// @vitest-environment jsdom
/**
 * Відео: вбудова, пряме посилання й порожній блок.
 * @module packages/ui/src/blocks/VideoBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { VideoBlock } from "./VideoBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "video", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

describe("VideoBlock", () => {
  it("без адреси нічого не малює", () => {
    const { container } = render(<VideoBlock {...block({ url: "" })} />);
    expect(container.firstChild).toBeNull();
  });

  it("YouTube стає вбудовою з пропорцією з CSS", () => {
    const { container } = render(
      <VideoBlock {...block({ url: "https://youtu.be/dQw4w9WgXcQ", title: "Лекція" })} />,
    );

    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.src).toContain("/embed/dQw4w9WgXcQ");
    expect(frame.className).toContain("wb-block-video__frame");
    expect(
      (container.querySelector(".wb-block-video__wrapper") as HTMLElement).className,
    ).not.toContain("--direct");
  });

  it("прямий файл — це плеєр, а не вбудова", () => {
    const { container } = render(
      <VideoBlock {...block({ url: "https://cdn.example.com/clip.mp4" })} />,
    );

    expect(container.querySelector("video")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      (container.querySelector(".wb-block-video__wrapper") as HTMLElement).className,
    ).toContain("wb-block-video__wrapper--direct");
  });
});
