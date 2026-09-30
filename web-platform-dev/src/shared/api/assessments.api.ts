/**
 * Самооцінка в платформі: реєстр тестів, історія, прийом проходження.
 *
 * **Клієнт не передає бал.** Він надсилає лише ключ тесту й номери обраних
 * варіантів, а сервер рахує за `scoreAssessment`. Тому розбіжність між тим,
 * що бачить людина, і тим, що збереглося, неможлива навіть помилкою на
 * клієнті.
 *
 * @module web-platform-dev/src/shared/api/assessments.api
 */

import type { AssessmentRecord, AssessmentTest, PeerTallies } from "@wwwuabot/shared/assessments";
import { apiFetch } from "./client";

const PATH = "/api/user/assessments";

/** Конверт відповіді — те саме, що віддає `api-dev`, а не тіло запиту. */
interface Envelope {
  ok: boolean;
  error?: string;
  tests?: AssessmentTest[];
  results?: AssessmentRecord[];
  records?: AssessmentRecord[];
  peers?: PeerTallies;
}

export interface AssessmentsSnapshot {
  readonly tests: readonly AssessmentTest[];
  readonly results: readonly AssessmentRecord[];
  /** Скільки людей у кожній смузі кожного тесту — без жодного ідентифікатора. */
  readonly peers: PeerTallies;
}

/**
 * Помилка з текстом **сервера**, а не з нашою здогадкою.
 *
 * «Не вдалося зберегти» нічого не каже людині, яка не може пройти тест: її
 * каже `validateAnswers` — «обери відповідь на кожне з 5 запитань».
 */
function assertOk(envelope: { ok: boolean; error?: string }): void {
  if (!envelope.ok) throw new Error(envelope.error ?? "Не вдалося виконати запит");
}

export const assessmentsApi = {
  /** Реєстр тестів разом з історією — «Розвиток» це один екран, а не два. */
  async list(testKey?: string): Promise<AssessmentsSnapshot> {
    const query = testKey ? `?test=${encodeURIComponent(testKey)}` : "";
    const envelope = await apiFetch<Envelope>(`${PATH}${query}`);
    assertOk(envelope);
    return {
      tests: envelope.tests ?? [],
      results: envelope.results ?? [],
      peers: envelope.peers ?? {},
    };
  },

  /**
   * Пройти тест.
   *
   * Повертає **збережені рядки**, а не локально пораховані бали: тож історія
   * поповнюється тими самими числами, які лежать у базі. Рядок **на кожну
   * шкалу** — тест із двома шкалами повертає два. Поруч — оновлений
   * розподіл: сервер рахує його вже після запису, тож блок «Ти не один» під
   * щойно збереженим результатом не бреше, що ти тут один.
   */
  async submit(
    testKey: string,
    answers: readonly number[],
  ): Promise<{ records: AssessmentRecord[]; peers: PeerTallies }> {
    const envelope = await apiFetch<Envelope>(PATH, {
      method: "POST",
      body: JSON.stringify({ test: testKey, answers }),
    });
    assertOk(envelope);
    if (!envelope.records?.length) throw new Error("Сервер не повернув результат");
    return { records: envelope.records, peers: envelope.peers ?? {} };
  },
};
