import type { BlockConfig, BaseBlock } from "./types";

class BlockRegistry {
  private internalMap = new Map<string, BlockConfig<BaseBlock, unknown>>();
  private tgTypeMap = new Map<string, BlockConfig<BaseBlock, unknown>>();

  register<T extends BaseBlock, TG>(config: BlockConfig<T, TG>) {
    if (this.internalMap.has(config.type)) {
      console.warn(`[Registry] Block type "${config.type}" is already registered. Overwriting.`);
    }
    this.internalMap.set(config.type, config as unknown as BlockConfig<BaseBlock, unknown>);
    this.tgTypeMap.set(config.tgType, config as unknown as BlockConfig<BaseBlock, unknown>);
  }

  getByInternalType(type: string): BlockConfig<BaseBlock, unknown> | undefined {
    return this.internalMap.get(type);
  }

  getByTgType(tgType: string): BlockConfig<BaseBlock, unknown> | undefined {
    return this.tgTypeMap.get(tgType);
  }

  getAllConfigs(): BlockConfig<BaseBlock, unknown>[] {
    return Array.from(this.internalMap.values()).filter((c) => !c.hidden);
  }

  serialize(blocks: BaseBlock[]): unknown[] {
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

  deserialize(tgBlocks: unknown[]): BaseBlock[] {
    return tgBlocks
      .map((tgBlock, index) => {
        if (!tgBlock || typeof tgBlock !== "object") {
          console.warn(`[Registry] Skipping non-object TG block`, tgBlock);
          return null;
        }
        const tgType = (tgBlock as { type: string }).type;
        const config = this.getByTgType(tgType);
        if (!config) {
          console.warn(`[Registry] No config for TG type: ${tgType} — keeping as passthrough`);
          const passthrough = this.getByInternalType("unknown");
          return passthrough ? passthrough.fromTelegram(tgBlock, index) : null;
        }
        return config.fromTelegram(tgBlock, index);
      })
      .filter(Boolean) as BaseBlock[];
  }
}

export const blockRegistry = new BlockRegistry();
