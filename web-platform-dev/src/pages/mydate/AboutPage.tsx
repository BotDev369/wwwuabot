import { useEffect } from "react";
import { useAppStore } from "@/stores/app.store";
import { icons, type IconName } from "@wwwuabot/shared";

const ico = (name: IconName, size = 20) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

export function AboutPage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);

  useEffect(() => {
    setScenarioName("MyDate");
  }, [setScenarioName]);

  return (
    <main>
      <section className="hero">
        <h1>Про системи аналізу</h1>
        <p className="hero-text">
          WWWUABot підтримує кілька систем аналізу дат. Кожна система має
          унікальний підхід до розрахунків та інтерпретації результатів.
        </p>

        <div className="wb-cards-grid">
          <div className="wb-card">
            <h3>{ico("sparkles")} Нумерологія</h3>
            <p>
              Аналіз на основі числових вібрацій дати. Кожна цифра має
              своє значення та вплив на долю людини.
            </p>
          </div>

          <div className="wb-card">
            <h3>{ico("eye")} Астрологія</h3>
            <p>
              Визначення зодіакального знаку, планетарного впливу та
              астрологічних аспектів на конкретну дату.
            </p>
          </div>

          <div className="wb-card">
            <h3>{ico("globe")} Таро</h3>
            <p>
              Створення розкладу на основі дати. Визначення карти дня,
              її значення та рекомендацій.
            </p>
          </div>

          <div className="wb-card">
            <h3>{ico("compare")} Статистика</h3>
            <p>
              Порівняння дат за різними параметрами: день тижня,季节,
              циклічність та інші статистичні показники.
            </p>
          </div>
        </div>

        <p className="hint" style={{ marginTop: "24px" }}>
          Більше систем буде додано в майбутньому. Слідкуйте за оновленнями!
        </p>
      </section>
    </main>
  );
}
