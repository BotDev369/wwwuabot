/**
 * Сигнал «лайк змінився» — для підтвердження, яке видно.
 *
 * Серце в хедері, малює підтвердження каркас: пропс через три рівні зробив би
 * кожен новий екран співучасником. Це подія, а не стан — стан лишається на сервері.
 *
 * @module packages/ui/src/favorites/like-feedback
 */

export interface LikeFeedback {
  /** Через що подія: щоб повторне натискання перезапустило анімацію. */
  id: number;
  liked: boolean;
}

type Listener = (feedback: LikeFeedback) => void;

const listeners = new Set<Listener>();
let lastId = 0;

/** «Лайк щойно змінився» — каже серце після відповіді сервера. */
export function announceLike(liked: boolean): void {
  lastId += 1;
  const feedback = { id: lastId, liked };
  for (const listener of listeners) listener(feedback);
}

/** Підписка на сигнал; повертає відписку. */
export function onLikeAnnounced(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
