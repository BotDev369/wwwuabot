export const TEXTS = {
  error: (env: string) =>
    env === "prod"
      ? "Вибачте, сталася технічна помилка. Ми вже працюємо над її вирішенням. 🛠"
      : "⚠️ Сталася помилка (Dev mode). Деталі в логах Cloudflare.",
};
