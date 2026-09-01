// Глобальний перемикач дебаг-логування.
// true  → всі [checkpoint] логи видно в `wrangler tail`
// false → повна тиша (для prod)

export const DEBUG = true;

export function log(checkpoint: string, message: string, data?: Record<string, any>): void {
  if (!DEBUG) return;

  const entry: Record<string, any> = {
    checkpoint,
    msg: message,
  };

  if (data) {
    Object.assign(entry, data);
  }

  console.log(
    `[${checkpoint}] ${message}${
      data
        ? " | " +
          Object.entries(data)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join(" | ")
        : ""
    }`,
  );
}
