/**
 * Форма нового повідомлення — **кому писати** і **що вже написано**.
 *
 * Обидва факти приходять одним запитом (`GET /api/messages/compose`), бо їх
 * читає одна поверхня в один момент: список отримувачів без чернеток показав би
 * форму без збереженого тексту, а чернетки без отримувачів — адресата, якого
 * немає в списку.
 *
 * **Дані читаються одразу, а не при відкритті форми.** Отримувачі — це зв'язані
 * контакти (зв'язок може з'явитися від того, що хтось прийшов за посиланням),
 * тож до моменту дотику вони вже завантажені, і форма відкривається заповненою,
 * а не порожнім станом на пів секунди.
 *
 * @module web-platform-dev/src/pages/useCompose
 */

import { useCallback, useEffect, useState } from "react";
import type { MessageDraft, MessagePeer } from "@wwwuabot/shared/messages";
import { messagesApi } from "@/shared/api/messages.api";

export interface ComposeState {
  /** Зв'язані через контакти — ті, кому лист дійде. */
  recipients: MessagePeer[];
  drafts: MessageDraft[];
  loading: boolean;
  error: string | null;
  /**
   * Зберегти чернетку; порожнє тіло — прибрати її.
   *
   * `false` — сервер відмовив: форма лишається відкритою з набраним текстом,
   * бо закрити її означало б сказати «збережено» про те, чого не зберегли.
   */
  saveDraft: (peerId: number, body: string) => Promise<boolean>;
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

  const saveDraft = useCallback(async (peerId: number, body: string): Promise<boolean> => {
    try {
      const draft = await messagesApi.saveDraft(peerId, body);
      // Стан оновлюємо з відповіді, а не з того, що надіслали: порожнє тіло
      // означає «чернетки більше немає», і вгадувати це вдруге не треба.
      setDrafts((prev) => {
        const rest = prev.filter((item) => item.peerId !== peerId);
        return draft ? [...rest, draft] : rest;
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
