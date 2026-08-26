import type { AppContext } from "../../../shared/types/env";
import { buildBanner } from "../../../shared/utils/banner";
import type { TttState, TttScore } from "./engine";

const COLORS = { play: "2563eb", win: "16a34a", lose: "dc2626", draw: "6b7280", home: "7c3aed" };

function funLine(status: string): string {
  const win = ["Бот уже планує реванш… 🤖", "Так тримати! 🎯", "Це була майстер-гра!"];
  const lose = ["Не здавайся — спробуй ще! 💪", "Бот сьогодні у формі 🤖", "Реванш?"];
  const draw = ["Гідна партія! 🤝", "Майже! Ще трохи — і перемога.", "Нічия — теж результат."];
  const arr = status === "win" ? win : status === "lose" ? lose : draw;
  return arr[Math.floor(Math.random() * arr.length)];
}

function scoreLine(score: TttScore): string {
  return `Рахунок — Ти ${score.w} : ${score.l} Бот · Нічиїх: ${score.d}`;
}

export function setHomeScreen(ctx: AppContext, score: TttScore, confirmReset = false): void {
  const name = ctx.from?.first_name || "друже";
  const rich: any[] = [
    {
      type: "photo",
      photo: {
        type: "photo",
        media: buildBanner(ctx.env, {
          lines: ["ХРЕСТИКИ-НОЛИКИ", `Твоя перша гра, ${name}!`],
          bgColor: COLORS.home,
          width: 600,
          height: 300,
        }),
      },
    },
    { type: "paragraph", text: "Зіграймо в три поспіль! Ти — ❌, бот — ⭕." },
    { type: "paragraph", text: scoreLine(score) },
  ];

  if (confirmReset) {
    rich.push({ type: "paragraph", text: "⚠️ Точно скинути весь рахунок?" });
  }

  console.log("[TTT:render] rich_data:", JSON.stringify(rich));

  const buttons: any[][] = confirmReset
    ? [
        [
          { text: "✅ Так, скинути", callback_data: "@ttt:reset_yes" },
          { text: "↩️ Скасувати", callback_data: "@ttt:reset_no" },
        ],
      ]
    : [
        [{ text: "▶ Почати гру", callback_data: "@ttt:start" }],
        [
          { text: "🗑 Скинути рахунок", callback_data: "@ttt:reset" },
          { text: "🚪 Вихід", callback_data: "main" },
        ],
      ];

  ctx.screen = {
    codeword: "ttt",
    photo_url: "",
    caption: {},
    buttons,
    rich_message: true,
    rich_data: rich,
  };
}

export function setGameScreen(ctx: AppContext, state: TttState, score: TttScore): void {
  const name = ctx.from?.first_name || "друже";
  let lines: string[];
  let color: string;

  if (state.status === "win") {
    lines = ["ПЕРЕМОГА!", `Гарно зіграно, ${name}!`];
    color = COLORS.win;
  } else if (state.status === "lose") {
    lines = ["БОТ ПЕРЕМІГ", "Реванш?"];
    color = COLORS.lose;
  } else if (state.status === "draw") {
    lines = ["НІЧИЯ", "Гідна партія!"];
    color = COLORS.draw;
  } else {
    lines = ["ХРЕСТИКИ-НОЛИКИ", `Твій хід, ${name}!`];
    color = COLORS.play;
  }

  const rich: any[] = [
    {
      type: "photo",
      photo: {
        type: "photo",
        media: buildBanner(ctx.env, { lines, bgColor: color, width: 600, height: 300 }),
      },
    },
    { type: "paragraph", text: scoreLine(score) },
  ];

  console.log("[TTT:render] rich_data:", JSON.stringify(rich));

  if (state.status !== "playing") rich.push({ type: "paragraph", text: funLine(state.status) });

  const buttons: any[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: any[] = [];
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const v = state.board[i];
      const text = v === "X" ? "❌" : v === "O" ? "⭕" : `${i + 1}`;
      row.push({ text, callback_data: `@ttt:cell:${i}` });
    }
    buttons.push(row);
  }

  if (state.status === "playing") {
    buttons.push([{ text: "🚪 Вихід", callback_data: "main" }]);
  } else {
    buttons.push([
      { text: "🔁 Реванш", callback_data: "@ttt:start" },
      { text: "🏠 Меню", callback_data: "@ttt:menu" },
    ]);
    buttons.push([{ text: "🚪 Вихід", callback_data: "main" }]);
  }

  ctx.screen = {
    codeword: "ttt",
    photo_url: "",
    caption: {},
    buttons,
    rich_message: true,
    rich_data: rich,
  };
}
