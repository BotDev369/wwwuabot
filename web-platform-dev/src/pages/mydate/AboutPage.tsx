import { useEffect } from "react";
import { useAppStore } from "@/stores/app.store";

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

        <div className="cards-grid">
          <div className="card">
            <h3>🔮 Нумерологія</h3>
            <p>
              Аналіз на основі числових вібрацій дати. Кожна цифра має
              своє значення та вплив на долю людини.
            </p>
          </div>

          <div className="card">
            <h3>⭐ Астрологія</h3>
            <p>
              Визначення зодіакального знаку, планетарного впливу та
              астрологічних аспектів на конкретну дату.
            </p>
          </div>

          <div className="card">
            <h3>🌍 Таро</h3>
            <p>
              Створення розкладу на основі дати. Визначення карти дня,
              її значення та рекомендацій.
            </p>
          </div>

          <div className="card">
            <h3>📊 Статистика</h3>
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
