/**
 * Сторож форматування текстів джерела.
 *
 * Тексти приходять абзацами й списками. Коли їх показували через
 * `white-space: pre-line`, три абзаци ставали стінкою без ритму: не видно,
 * де кінець думки. Тому поділ на абзаци й списки — це не смак, а тест.
 *
 * Перевіряються **тексти, які бачить людина** — з інструментів, а не з
 * внутрішніх модулів: перевіряти треба те, що рендериться, а не внутрішню
 * структуру сховища текстів.
 */
import { describe, expect, it } from "vitest";
import { MOOD_ANXIETY } from "@wwwuabot/shared/assessments";

/**
 * Усі смуги всіх шкал: саме їх бачить людина в блоці «Що це означає».
 *
 * Розгортається в цикл, а не перелічується: тест, що читає реєстр, падає
 * на новій шкалі тоді, коли хтось забув додати їй текст.
 */
const NOTES: readonly string[] = MOOD_ANXIETY.scales.flatMap((scale) =>
  scale.bands.map((band) => band.note),
);

const BULLET = "— ";

/** Рядки одного блоку після обрізання порожніх. */
const lines = (block: string): string[] =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const blocks = (note: string): string[] =>
  note
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

describe("тексти джерела придатні до показу", () => {
  it("кожен рівень має щонайменше два абзаци", () => {
    // Один абзац — це не пояснення, а рядок. Після злиття абзаців
    // «смуга виглядає голою» стає непомітним, і ніхто не помітить.
    for (const note of NOTES) {
      expect(blocks(note).length, note.slice(0, 40)).toBeGreaterThanOrEqual(2);
    }
  });

  it("кожен блок або проза, або список — змішаних немає", () => {
    // Регресія: «Що робити:» + маркери в одному блоці рендерилися як стінка,
    // бо блок не був ані тим, ані іншим. Тепер підпис над списком розпізнано,
    // і цей тест не дасть злипти їх знову.
    for (const note of NOTES) {
      for (const block of blocks(note)) {
        const rows = lines(block);
        const marked = rows.filter((row) => row.startsWith(BULLET)).length;
        const labelAboveList =
          rows.length > 1 &&
          rows[0].endsWith(":") &&
          rows.slice(1).every((r) => r.startsWith(BULLET));
        const plainProse = rows.length === 1;
        expect(
          marked === 0 || marked === rows.length || labelAboveList || plainProse,
          block.slice(0, 50),
        ).toBe(true);
      }
    }
  });

  it("списки «що робити» є в більшості рівнів", () => {
    const withList = NOTES.filter((note) =>
      blocks(note).some((block) => lines(block).some((row) => row.startsWith(BULLET))),
    );
    // Списки не скрізь, але де є — це справді списки, а не стінка.
    expect(withList.length).toBeGreaterThanOrEqual(6);
  });

  it("абзац прози не довший за чотири рядки — інакше це злипана стінка", () => {
    // Список із шістьох пунктів — це нормально: його видно з першого рядка й
    // він читається по вертикалі. А от блок проси з п'яти рядків читається як
    // суцільний потік, і це те, що ми бачили на екрані.
    for (const note of NOTES) {
      for (const block of blocks(note)) {
        const rows = lines(block);
        if (rows.some((row) => row.startsWith(BULLET))) continue;
        expect(rows.length, block.slice(0, 40)).toBeLessThanOrEqual(4);
      }
    }
  });
});
