/**
 * Звук партії — те, що ламається мовчки.
 *
 * Німа гра не падає й не червоніє в CI: вона просто німа. Тож перевіряємо те,
 * що можна перевірити без вух: партитура має ноти, кожна нота — скінченні
 * числа, а карта без `AudioContext` (тести, старий WebView) і карта, якій
 * браузер ще не дозволив звук, поводяться однаково тихо — без жодної ноти.
 *
 * @module web-platform-dev/src/pages/games/sound.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { SOUNDS, createSoundKit, type GameSound } from "./sound";

const NAMES = Object.keys(SOUNDS) as GameSound[];

/** Фальшива звукова карта: пише, які ноти в неї справді поставили. */
function stubAudio(state: AudioContextState | "running"): {
  kit: ReturnType<typeof createSoundKit>;
  notes: number[];
  resumes: () => number;
  closes: () => number;
} {
  const notes: number[] = [];
  let resumes = 0;
  let closes = 0;

  const audio = {
    state,
    currentTime: 0,
    destination: {},
    resume: () => {
      resumes += 1;
      return Promise.resolve();
    },
    close: () => {
      closes += 1;
      return Promise.resolve();
    },
    createGain: () => ({
      gain: {
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: () => undefined,
    }),
    createOscillator: () => ({
      type: "",
      frequency: {
        setValueAtTime: (freq: number) => notes.push(freq),
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    }),
  };

  vi.stubGlobal("window", {
    // Конструктор, який повертає обʼєкт, — і є фальшива карта
    AudioContext: function AudioContextStub() {
      return audio;
    },
  });

  return { kit: createSoundKit(), notes, resumes: () => resumes, closes: () => closes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("партитура", () => {
  it("на кожну подію гри є ноти", () => {
    for (const name of NAMES) expect(SOUNDS[name].length, name).toBeGreaterThan(0);
  });

  it("ноти впорядковані за часом — інакше звук збирався б у купу", () => {
    for (const name of NAMES) {
      const at = SOUNDS[name].map((tone) => tone.at);
      expect(
        [...at].sort((a, b) => a - b),
        name,
      ).toEqual(at);
    }
  });

  it("кожна нота має скінченні висоту, тривалість і гучність", () => {
    for (const name of NAMES) {
      for (const tone of SOUNDS[name]) {
        expect(Number.isFinite(tone.freq), name).toBe(true);
        expect(tone.freq).toBeGreaterThan(0);
        expect(tone.dur).toBeGreaterThan(0);
        expect(tone.gain).toBeGreaterThan(0);
        expect(tone.gain).toBeLessThan(0.5);
      }
    }
  });
});

describe("звукова карта", () => {
  it("без `AudioContext` гра мовчить, а не падає", () => {
    const kit = createSoundKit();
    for (const name of NAMES) expect(() => kit.play(name)).not.toThrow();
    expect(() => kit.unlock()).not.toThrow();
    expect(() => kit.close()).not.toThrow();
  });

  it("ставит рівно ті ноти, що в партитурі", () => {
    const { kit, notes } = stubAudio("running");
    kit.play("catch");

    expect(notes).toEqual(SOUNDS.catch.map((tone) => tone.freq));
  });

  it("сплячій карті браузер ще не дозволив звук: нота не губиться, а не звучить", () => {
    const { kit, notes, resumes } = stubAudio("suspended");
    kit.play("level");

    expect(notes).toEqual([]);
    expect(resumes()).toBe(1);
  });

  it("розблокування кличе `resume`, а закриття — `close`", () => {
    const { kit, resumes, closes } = stubAudio("suspended");
    kit.unlock();
    kit.close();

    expect(resumes()).toBe(1);
    expect(closes()).toBe(1);
  });
});
