/**
 * Підтвердження лайка — коротке, поверх усього, і зникає саме.
 *
 * Воно не вимагає дотику: дія односкладова, а бракувало їй лише знаку, що вона
 * відбулась. Портал у `body` — бо `backdrop-filter` хедера контейнить `fixed`.
 *
 * @module packages/ui/src/favorites/LikeToast
 */

import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@wwwuabot/shared";
import { onLikeAnnounced, type LikeFeedback } from "./like-feedback";

/** Скільки плитка висить: досить, щоб прочитати одне слово, і не більше. */
export const LIKE_TOAST_MS = 2400;

export function LikeToast(): ReactElement | null {
  const [feedback, setFeedback] = useState<LikeFeedback | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = onLikeAnnounced((next) => {
      setFeedback(next);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setFeedback(null);
        timer = null;
      }, LIKE_TOAST_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!feedback) return null;

  return createPortal(
    <div
      // Ключ від події: друге натискання перезапускає анімацію, а не лишає
      // плитку догорати від першого.
      key={feedback.id}
      className={`wb-like-toast${feedback.liked ? "" : " wb-like-toast--off"}`}
      role="status"
      aria-live="polite"
    >
      <Icon name={feedback.liked ? "heart" : "close"} size={16} />
      <span>{feedback.liked ? "Додано в обране" : "Прибрано з обраного"}</span>
    </div>,
    document.body,
  );
}
