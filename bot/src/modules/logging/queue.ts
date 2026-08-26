import { LogMessage } from "../../shared/types/log";
import { Env } from "../../shared/types/env";

export class LogQueueService {
  /**
   * Відправляє структурований лог у Cloudflare Queue.
   * Якщо черга недоступна (крайній випадок), fallback-имо в консоль CF.
   */
  static async push(env: Env, log: LogMessage): Promise<void> {
    try {
      await env.LOG_QUEUE.send(log);
    } catch (error) {
      // Fallback: якщо сам Queue відмовив, пишемо в консоль CF
      console.error(
        JSON.stringify({
          level: "error",
          context: "queue_send_critical_failure",
          message: error instanceof Error ? error.message : String(error),
          dropped_log: log,
        }),
      );
    }
  }
}
