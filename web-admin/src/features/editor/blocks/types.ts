import type { ComponentType } from "react";

// ─── Базовий інтерфейс для будь-якого блоку всередині нашої адмінки ───────────
export interface BaseBlock {
  id: string;
  type: string; // Внутрішній тип (наприклад, "heading", "paragraph")
}

// ─── Конфігурація для Реєстру (описує один тип блоку) ─────────────────────────
export interface BlockConfig<TInternal extends BaseBlock = BaseBlock, TTelegram = any> {
  type: string; // Внутрішній тип (для UI та Zustand)
  tgType: string; // Тип, який вимагає Telegram Bot API (наприклад, "heading", "paragraph")
  label: string; // Назва для UI (наприклад, "Заголовок")
  icon: string; // Іконка для пікера (наприклад, "H", "¶")
  hidden?: boolean; // true = не показувати в пікері "Додати блок" (службові блоки)

  // Фабрика: створює порожній блок цього типу для UI
  createDefault: (id: string) => TInternal;

  // React-компоненти для рендерингу
  Editor: ComponentType<{ block: TInternal; idx: number; total: number }>;
  Preview: ComponentType<{ block: TInternal }>;

  // Серіалізація: з нашого UI-стану в JSON для Telegram API
  toTelegram: (block: TInternal) => TTelegram;

  // Десеріалізація: з JSON Telegram API назад у наш UI-стан
  fromTelegram: (tgBlock: TTelegram, index: number) => TInternal;
}
