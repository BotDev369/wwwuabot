/**
 * Типи компонентів повідомлень — склад дає оболонка, вигляд спільний.
 *
 * Та сама пара «склад ↔ розмітка», що в нотатках і контактах: **дані** й дії
 * (`onSend`, `onOpen`) приходять від оболонки, а як це виглядає й поводиться —
 * спільне. Друга копія розмітки в другій оболонці розійшлася б із першою на
 * першій же правці — саме тому це кирпичик, а не «стиль оболонки».
 *
 * @module @wwwuabot/ui/messages
 */

import type { Conversation, Message, MessagePeer } from "@wwwuabot/shared/messages";

export interface ConversationListProps {
  conversations: readonly Conversation[];
  /** Хто я — потрібно, щоб позначити **своє** в рядку («Ви: …»). */
  meId: number;
  /** Відкрити розмову зі співрозмовником. */
  onOpen: (peerId: number) => void;
}

export interface ThreadSheetProps {
  /** Співрозмовник; `null` — ще не знаємо, бо стрічка не прийшла. */
  peer: MessagePeer | null;
  /** Хто я: бульбашка праворуч — моя, ліворуч — чужа. */
  meId: number;
  messages: readonly Message[];
  loading?: boolean;
  error?: string | null;
  sending?: boolean;
  /**
   * Надіслати текст; порожнє поле цього не робить.
   *
   * `true` означає, що сервер підтвердив надсилання — лише тоді поле вводу
   * чиститься. Порожнє поле після невдачі виглядало б як успіх і коштувало б
   * людини втраченого тексту.
   */
  onSend: (body: string) => Promise<boolean>;
  onClose: () => void;
}
