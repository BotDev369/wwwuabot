/**
 * Page Builder — Video Block.
 *
 * Embeds video from YouTube, Vimeo, or direct URL (.mp4/.webm).
 *
 * @module packages/ui/src/blocks/VideoBlock
 */

import { useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

/** Extract YouTube video ID from various URL formats. */
function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m?.[1] ?? null;
}

/** Extract Vimeo video ID from URL. */
function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? null;
}

export function VideoBlock({ block }: BlockComponentProps) {
  const {
    url = "",
    title = "",
    caption = "",
    autoplay = false,
    loop = false,
  } = block.props as {
    url?: string;
    title?: string;
    caption?: string;
    autoplay?: boolean;
    loop?: boolean;
  };

  const embedUrl = useMemo(() => {
    if (!url) return null;

    const ytId = getYouTubeId(url);
    if (ytId) {
      const params = new URLSearchParams({
        rel: "0",
        modestbranding: "1",
        ...(autoplay ? { autoplay: "1" } : {}),
        ...(loop ? { loop: "1", playlist: ytId } : {}),
      });
      return `https://www.youtube.com/embed/${ytId}?${params}`;
    }

    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      const params = new URLSearchParams({
        ...(autoplay ? { autoplay: "1" } : {}),
        ...(loop ? { loop: "1" } : {}),
      });
      return `https://player.vimeo.com/video/${vimeoId}?${params}`;
    }

    // Direct video URL
    return url;
  }, [url, autoplay, loop]);

  if (!embedUrl) return null;

  const isDirect = /\.(mp4|webm|ogg)(\?|$)/i.test(url);

  return (
    <figure className="wb-block-video">
      {title && <h4 className="wb-block-video__title wb-font-semibold">{title}</h4>}
      <div
        className={`wb-block-video__wrapper${isDirect ? " wb-block-video__wrapper--direct" : ""}`}
      >
        {isDirect ? (
          <video
            className="wb-block-video__player"
            src={embedUrl}
            controls
            autoPlay={autoplay}
            loop={loop}
          />
        ) : (
          <iframe
            className="wb-block-video__frame"
            src={embedUrl}
            title={title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      {caption && <figcaption className="wb-block-video__caption wb-text-sm">{caption}</figcaption>}
    </figure>
  );
}
