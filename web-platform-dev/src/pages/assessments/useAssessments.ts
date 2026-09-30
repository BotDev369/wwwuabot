/**
 * Стан екрана «Розвиток»: реєстр тестів, історія, прийом проходження.
 *
 * **Хук — стан і логіка, жодного JSX.** Екран лише малює те, що тут
 * називається; це розділення тримає правило, що спільний код і екрани не
 * розмішуються.
 *
 * **Дані оновлюються локально, а не повторним запитом.** Сервер повертає
 * збережений рядок, тож після проходження ми просто додаємо його в історію —
 * інакше список «блимнув» би завантаженням після кожної відповіді.
 *
 * @module web-platform-dev/src/pages/assessments/useAssessments
 */

import { useCallback, useEffect, useState } from "react";
import type { AssessmentRecord, AssessmentTest, PeerTallies } from "@wwwuabot/shared/assessments";
import { assessmentsApi } from "@/shared/api/assessments.api";

export interface AssessmentsState {
  tests: readonly AssessmentTest[];
  /** Історія всіх тестів разом, новіші спершу — так її віддає сервер. */
  results: readonly AssessmentRecord[];
  /** Розподіл по смугах: скільки людей, без імен. */
  peers: PeerTallies;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /**
   * Пройти тест: надсилає відповіді, повертає збережені рядки — **по одному на
   * кожну шкалу**. «Тревожність і депресія» має дві шкали, тож проходження
   * повертає два бали, і список історії поповнюється обома.
   */
  submit: (testKey: string, answers: readonly number[]) => Promise<AssessmentRecord[]>;
  /** Зняти помилку після того, як людина її побачила. */
  clearError: () => void;
}

export function useAssessments(): AssessmentsState {
  const [tests, setTests] = useState<readonly AssessmentTest[]>([]);
  const [results, setResults] = useState<readonly AssessmentRecord[]>([]);
  const [peers, setPeers] = useState<PeerTallies>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` — не формальність: сторінку закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у знятому дереві.
    let cancelled = false;

    assessmentsApi
      .list()
      .then((snapshot) => {
        if (cancelled) return;
        setTests(snapshot.tests);
        setResults(snapshot.results);
        setPeers(snapshot.peers);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити тести");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(async (testKey: string, answers: readonly number[]) => {
    setSaving(true);
    setError(null);
    try {
      // Розподіл приходить разом із результатом: це один запит, і він уже
      // враховує щойно записані рядки, тож блок «Ти не один» під ними каже
      // правду, а не «ти тут один».
      const { records, peers: fresh } = await assessmentsApi.submit(testKey, answers);
      setResults((prev) => [...records, ...prev]);
      setPeers(fresh);
      return records;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти результат");
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { tests, results, peers, loading, saving, error, submit, clearError };
}
