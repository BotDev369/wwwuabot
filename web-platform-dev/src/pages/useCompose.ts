/**
 * Чернетки й адресати — **два факти одного запиту**.
 *
 * Обидва приходять із `GET /api/messages/compose`, бо їх читає одна поверхня в
 * один момент: список отримувачів без чернеток показав би форму без адресата,
 * якого в списку немає, а чернетки без отримувачів — рядок без підпису.
 *
 * **Дані читаються одразу, а не при відкритті форми.** Отримувачі — це зв'язані
 * контакти (зв'язок може з'явитися від того, що хтось прийшов за посиланням), а
 * чернетки видно **в списку**, а не лише у формі — тож до першого дотику вони
 * вже завантажені.
 *
 * @module web-platform-dev/src/pages/useCompose
 */

import { useCallback, useEffect, useState } from "react";
import type { MessageDraft, MessageDraftInput, MessagePeer } from "@wwwuabot/shared/messages";
import { messagesApi } from "@/shared/api/messages.api";

export interface ComposeState {
  /** Зв'язані через контакти — ті, кому лист дійде. */
  recipients: MessagePeer[];
  /** Усі чернетки — окремим блоком списку, а не рядком розмови. */
  drafts: MessageDraft[];
  loading: boolean;
  error: string | null;
  /**
   * Зберегти чернетку: нову, правку наявної або — порожнім текстом — прибрати.
   *
   * `false` — сервер відмовив: форма лишається відкритою з набраним текстом,
   * бо закрити її означало б сказати «збережено» про те, чого не зберегли.
   */
  saveDraft: (input: MessageDraftInput) => Promise<boolean>;
  /**
   * Перечитати — покликати після повернення з розмови: зв'язок через контакти
   * з'являється **не від наших дій** (хтось прийшов за посиланням), тож список
   * отримувачів мусить мати момент, коли його оновлюють.
   */
  reload: () => Promise<void>;
}

export function useCompose(): ComposeState {
  const [recipients, setRecipients] = useState<MessagePeer[]>([]);
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const compose = await messagesApi.compose();
      setRecipients(compose.recipients);
      setDrafts(compose.drafts);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити контакти");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const saveDraft = useCallback(async (input: MessageDraftInput): Promise<boolean> => {
    try {
      const saved = await messagesApi.saveDraft(input);
      // Стан оновлюємо з відповіді, а не з того, що надіслали: порожній текст
      // означає «чернетки більше немає», і вгадувати це вдруге не треба.
      setDrafts((prev) => {
        const rest = prev.filter((item) => item.id !== input.id);
        // Збережена — **нагору**: її щойно правили, і саме так її поставив би
        // порядок сервера (найсвіжіша згори).
        return saved ? [saved, ...rest] : rest;
      });
      setError(null);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти чернетку");
      return false;
    }
  }, []);

  return { recipients, drafts, loading, error, saveDraft, reload: load };
}
