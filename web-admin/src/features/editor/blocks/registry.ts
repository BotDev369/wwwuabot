import type { BlockConfig, BaseBlock } from "./types";

/**
 * Центральний Реєстр блоків.
 * Зберігає всі налаштування для кожного типу блоку і дозволяє
 * миттєво конвертувати дані між UI-станом та форматом Telegram API.
 */
class BlockRegistry {
  // Мапа для пошуку за внутрішнім типом (UI -> TG)
  private internalMap = new Map<string, BlockConfig<any, any>>();
  // Мапа для пошуку за типом Telegram (TG -> UI)
  private tgTypeMap = new Map<string, BlockConfig<any, any>>();

  /**
   * Реєструє новий тип блоку в системі.
   */
  register<T extends BaseBlock, TG>(config: BlockConfig<T, TG>) {
    if (this.internalMap.has(config.type)) {
      console.warn(`[Registry] Block type "${config.type}" is already registered. Overwriting.`);
    }
    this.internalMap.set(config.type, config);
    this.tgTypeMap.set(config.tgType, config);
  }

  /**
   * Повертає конфіг за внутрішнім типом (наприклад, "heading").
   */
  getByInternalType(type: string): BlockConfig<any, any> | undefined {
    return this.internalMap.get(type);
  }

  /**
   * Повертає конфіг за типом Telegram API (наприклад, "paragraph").
   */
  getByTgType(tgType: string): BlockConfig<any, any> | undefined {
    return this.tgTypeMap.get(tgType);
  }

  /**
   * Повертає список усіх зареєстрованих блоків (для BlockPicker в UI).
   */
  getAllConfigs(): BlockConfig<any, any>[] {
    return Array.from(this.internalMap.values()).filter((c) => !c.hidden);
  }

  /**
   * Конвертує масив внутрішніх блоків у JSON для Telegram API.
   */
  serialize(blocks: BaseBlock[]): any[] {
    return blocks
      .map((block) => {
        const config = this.getByInternalType(block.type);
        if (!config) {
          console.warn(`[Registry] No config for internal type: ${block.type}`);
          return null;
        }
        return config.toTelegram(block);
      })
      .filter(Boolean);
  }

  /**
   * Конвертує JSON від Telegram API назад у масив внутрішніх блоків для UI.
   */
  deserialize(tgBlocks: any[]): BaseBlock[] {
    return tgBlocks
      .map((tgBlock, index) => {
        if (!tgBlock || typeof tgBlock !== "object") {
          console.warn(`[Registry] Skipping non-object TG block`, tgBlock);
          return null;
        }
        const tgType = tgBlock.type;
        const config = this.getByTgType(tgType);
        if (!config) {
          console.warn(`[Registry] No config for TG type: ${tgType} — keeping as passthrough`);
          const passthrough = this.getByInternalType("unknown");
          return passthrough ? passthrough.fromTelegram(tgBlock, index) : null;
        }
        return config.fromTelegram(tgBlock, index);
      })
      .filter(Boolean);
  }
}

// Експортуємо єдиний інстанс реєстру на весь проєкт
export const blockRegistry = new BlockRegistry();
