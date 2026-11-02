/**
 * Демо-стаття: шапка, числа, графіки, цитата, картка й питання.
 *
 * Розмітка — справжні блоки `@wwwuabot/ui/blocks`, тож сторінка показує
 * продукт, а не макет: той самий CSS і та сама поведінка.
 * @module web-admin-dev/src/pages/style/DemoArticle
 */

import {
  BadgeBlock,
  ButtonsBlock,
  CardBlock,
  ChartBlock,
  FaqBlock,
  FeatureCardBlock,
  ListBlock,
  ProgressBlock,
  QuoteBlock,
  StatBlock,
  TableBlock,
  TextBlock,
} from "@wwwuabot/ui/blocks";
import { demo } from "./demo";

const STATS = [
  {
    value: "28,8%",
    label: "Християни",
    trend: "down",
    trendValue: "1,8 в. п.",
    description: "частка у світі, 2020",
  },
  {
    value: "25,6%",
    label: "Мусульмани",
    trend: "up",
    trendValue: "1,8 в. п.",
    description: "частка у світі, 2020",
  },
  {
    value: "2,4 млрд",
    label: "Люди",
    trend: "up",
    trendValue: "+140 млн",
    description: "за десять років",
  },
  {
    value: "12",
    label: "Джерел",
    trend: "neutral",
    trendValue: "",
    description: "у переліку статті",
  },
];

const BARS = [
  { label: "2010", value: 30 },
  { label: "2015", value: 34 },
  { label: "2020", value: 38 },
  { label: "2025", value: 41 },
];

const PIE = [
  { label: "Переписи", value: 46 },
  { label: "Опитування", value: 32 },
  { label: "Оцінки", value: 22 },
];

const SLOPE = [
  { label: "Християни", from: 30.6, to: 28.8 },
  { label: "Мусульмани", from: 23.8, to: 25.6 },
  { label: "Без релігії", from: 16.3, to: 18.7 },
];

const HEAT = [
  { label: "Християни", cells: [28.8, 32.2, 26.4] },
  { label: "Мусульмани", cells: [25.6, 25.2, 24.1] },
  { label: "Без релігії", cells: [16.3, 15.8, 18.7] },
];

const TABLE = {
  headers: ["Джерело", "Рік", "Оцінка"],
  rows: [
    ["Pew Research", "2020", "28,8%"],
    ["World Religion Database", "2021", "32,2%"],
    ["Перепис", "2019", "26,4%"],
  ],
};

const FEATURES = [
  {
    icon: "◆",
    title: "Токени",
    description: "Колір, міра й тінь приходять із теми, а не з розмітки.",
  },
  {
    icon: "◇",
    title: "Блоки",
    description: "Той самий блок стоїть і в статті, і в конструкторі сторінок.",
  },
  {
    icon: "○",
    title: "Теми",
    description: "Шість настроїв змінюють весь екран, не ламаючи жодного правила.",
  },
];

const FAQ = [
  {
    question: "Чому тут немає переліку токенів?",
    answer:
      "Бо перелік не показує, як продукт виглядає. Значення друкує CSS, а ця сторінка показує результат.",
  },
  {
    question: "Що означає версія вгорі?",
    answer:
      "Це відбиток усіх CSS-файлів. Змінилась версія — змінився вигляд, і сторінка скаже про це банером.",
  },
  {
    question: "Тема змінюється тільки тут?",
    answer: "Ні: це той самий вибір, що в продукті, тож обрана тема лишиться й на інших екранах.",
  },
];

export function DemoArticle() {
  return (
    <>
      <section className="st-section">
        <header className="wb-research-hero">
          <span className="wb-research-kicker">Візуал продукту</span>
          <h2 className="wb-research-title">Один екран, у якому видно весь продукт</h2>
          <p className="wb-research-lead">
            Це не макет і не довідник: тут стоять справжні блоки, картки, графіки й поля. Змініть
            тему — і сторінка перефарбується разом із продуктом.
          </p>
        </header>
        <BadgeBlock
          {...demo("badge", {
            items: [
              { text: "шість тем", variant: "accent" },
              { text: "живі дані", variant: "green" },
              { text: "усі поверхні", variant: "neutral" },
            ],
          })}
        />
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Числа</h3>
        <div className="st-stats">
          {STATS.map((stat) => (
            <StatBlock key={stat.label} {...demo("stat", stat)} />
          ))}
        </div>
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Дані й графіки</h3>
        <div className="st-charts">
          <ChartBlock {...demo("chart", { title: "Люди без релігії, млн", data: BARS })} />
          <ChartBlock {...demo("chart", { type: "pie", title: "Звідки дані", data: PIE })} />
          <ChartBlock
            {...demo("chart", {
              type: "slope",
              title: "Дві хвилі за десять років",
              fromLabel: "2010",
              toLabel: "2020",
              data: SLOPE,
            })}
          />
          <ChartBlock
            {...demo("chart", {
              type: "heatmap",
              title: "Оцінки джерел",
              columns: ["Pew", "WRD", "Перепис"],
              unit: "%",
              rows: HEAT,
            })}
          />
        </div>
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Текст</h3>
        <TextBlock
          {...demo("text", {
            level: "h3",
            title: "Що змінилось у вигляді",
            content:
              "З'явився спектр даних, градієнтні зв'язки й тоновані поверхні. Смуга цитати, цифра показника й штрих перед назвою графіка тепер кажуть, що кольори належать одній історії.",
          })}
        />
        <QuoteBlock
          {...demo("quote", {
            text: "Смак — це коли прибрати нічого. Система — це коли прибране не повертається іншим кольором.",
            author: "Дизайн-система",
            role: "правила, а не смак",
          })}
        />
        <ListBlock
          {...demo("list", {
            items: [
              { text: "Один акцент", description: "більше не означає «все одного кольору»" },
              { text: "Шість тем", description: "кожна зі своїм спектром і своїм настроєм" },
              { text: "Живі дані", description: "висота, кут і насиченість народжуються з чисел" },
            ],
          })}
        />
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Картка, таблиця, показник</h3>
        <CardBlock
          {...demo("card", {
            title: "Дані на платформі",
            description: "Картка світліша за екран і тримає край волосиною.",
          })}
        >
          <TextBlock
            {...demo("text", {
              content:
                "Той самий блок стоїть у статті, конструкторі сторінок і на цій демосторінці — без жодного власного стилю.",
            })}
          />
          <ButtonsBlock
            {...demo("buttons", {
              items: [
                { text: "Переглянути", variant: "primary" },
                { text: "Завантажити", variant: "secondary" },
                { text: "Пізніше", variant: "ghost" },
              ],
            })}
          />
        </CardBlock>
        <TableBlock {...demo("table", TABLE)} />
        <ProgressBlock
          {...demo("progress", { label: "Зібрано джерел", value: 8, max: 12, color: "green" })}
        />
      </section>

      <section className="st-section">
        <h3 className="st-section-title">Плитки й питання</h3>
        <FeatureCardBlock {...demo("feature-card", { items: FEATURES })} />
        <FaqBlock {...demo("faq", { title: "Часті питання", items: FAQ })} />
      </section>
    </>
  );
}
