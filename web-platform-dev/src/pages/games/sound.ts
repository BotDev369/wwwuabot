/**
 * Звук партії — **синтез, а не файли**.
 *
 * **Чому не mp3.** Звук у цьому проєкті — такий самий кірпичик гри, як палітра:
 * він не має ні ваги бандла, ні бібліотеки, і його треба вміти підкрутити
 * одним числом. Чотири ноти, синтезовані `AudioContext`, звучать рівно так, як
 * у приладі Електроніки, і при цьому не додають до репозиторію жодного байта
 * аудіо.
 *
 * **Ноти — дані, а не код.** `SOUNDS` описує, що грає на подію: коли нота
 * береться, яка висота, скільки триває. Тести перевіряють саме цей опис, без
 * звукової карти, а планувальник (`createSoundKit`) лишається тонким.
 *
 * **Без `AudioContext` модуль — no-op.** У тестах середовище `node`, у WebView
 * браузер може не дати звук до першого дотику: у обох випадках гра має
 * працювати мовчки, а не падати.
 *
 * @module web-platform-dev/src/pages/games/sound
 */

/** Що вміє сказати гра. Більше звуків, ніж подій, тут не потрібно. */
export type GameSound = "catch" | "miss" | "level" | "over";

/** Одна нота: коли, як високо, як довго й як гучно. */
export interface Tone {
  /** Відступ від початку звуку, с. */
  at: number;
  freq: number;
  /** Куди веде висота; без цього нота звучить рівно. */
  to?: number;
  dur: number;
  gain: number;
  type: OscillatorType;
}

/**
 * Партитура подій.
 *
 * Удача — дві короткі ноти вгору (той самий «дзиг» приладу), промах — одна
 * понижена, рівень — три ноти драбинкою, кінець — три ноти вниз. Гучність
 * свідомо невелика: у навушниках партія не має бити по вухах.
 */
export const SOUNDS: Record<GameSound, readonly Tone[]> = {
  catch: [
    { at: 0, freq: 880, dur: 0.06, gain: 0.1, type: "square" },
    { at: 0.06, freq: 1320, dur: 0.09, gain: 0.09, type: "square" },
  ],
  miss: [{ at: 0, freq: 330, to: 150, dur: 0.24, gain: 0.11, type: "triangle" }],
  level: [
    { at: 0, freq: 660, dur: 0.08, gain: 0.09, type: "square" },
    { at: 0.09, freq: 880, dur: 0.08, gain: 0.09, type: "square" },
    { at: 0.18, freq: 1170, dur: 0.12, gain: 0.09, type: "square" },
  ],
  over: [
    { at: 0, freq: 520, dur: 0.16, gain: 0.11, type: "triangle" },
    { at: 0.18, freq: 390, dur: 0.16, gain: 0.11, type: "triangle" },
    { at: 0.36, freq: 260, dur: 0.3, gain: 0.11, type: "triangle" },
  ],
};

/** Тиша замість помилки: звук — прикраса, а не умова партії. */
function swallow(): void {
  /* навмисно порожньо */
}

/** Конструктор звукової карти: у Safari він досі з префіксом. */
type AudioCtor = new () => AudioContext;

function audioCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as Window & { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

/** Одна нота в звуковій карті. */
function schedule(ctx: AudioContext, tone: Tone): void {
  const start = ctx.currentTime + tone.at;
  const gain = ctx.createGain();
  // Гучність веде горбом: різкий початок на синусоїді чути як клац
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(tone.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);

  const osc = ctx.createOscillator();
  osc.type = tone.type;
  osc.frequency.setValueAtTime(tone.freq, start);
  if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.dur);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + tone.dur + 0.02);
}

export interface SoundKit {
  /** Зіграти подію. Мовчить, якщо браузер ще не дозволив звук. */
  play: (sound: GameSound) => void;
  /** Розблокувати звук — кличеться на перший дотик, поки гра ще без нього. */
  unlock: () => void;
  close: () => void;
}

/**
 * Звукова карта партії.
 *
 * Карта створюється **ліниво**, на перший звук: `AudioContext` до дотику
 * людини браузер віддає «сплячим», а дотик у грі буде — кошик ведуть пальцем.
 * Якщо ж ні, гра лишається мовчки: пропущений звук краще за юрбу нот, яка
 * вистрелить після першого дотику.
 */
export function createSoundKit(): SoundKit {
  let ctx: AudioContext | null = null;

  const ensure = (): AudioContext | null => {
    if (ctx) return ctx;
    const Ctor = audioCtor();
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      ctx = null;
    }
    return ctx;
  };

  const wake = (audio: AudioContext): void => {
    if (audio.state !== "running") audio.resume().catch(swallow);
  };

  return {
    unlock(): void {
      const audio = ensure();
      if (audio) wake(audio);
    },
    play(sound: GameSound): void {
      const audio = ensure();
      if (!audio) return;
      if (audio.state !== "running") {
        wake(audio);
        return;
      }
      for (const tone of SOUNDS[sound]) schedule(audio, tone);
    },
    close(): void {
      const audio = ctx;
      ctx = null;
      audio?.close().catch(swallow);
    },
  };
}
