import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function CompareSetupPage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const [input, setInput] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setScenarioName("MyDate");
  }, [setScenarioName]);

  const addDate = () => {
    if (!input) return;
    setDates((prev) => (prev.includes(input) ? prev : [...prev, input]));
    setInput("");
  };

  const move = (index: number, dir: -1 | 1) => {
    setDates((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => setDates((prev) => prev.filter((_, i) => i !== index));

  const goSelect = () => {
    if (dates.length === 0) return;
    navigate(`/mydate/compare/systems?dates=${encodeURIComponent(dates.join(","))}`);
  };

  return (
    <main>
      <section className="hero">
        <h1>Співставлення дат</h1>
        <p className="hero-text">
          Вкажіть дати для аналізу. Дати можна переміщати — це визначить порядок відображення в
          таблиці.
        </p>

        <div className="date-input-row">
          <input
            type="date"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="wb-input"
          />
          <button className="wb-btn wb-btn-inline" onClick={addDate} disabled={!input}>
            Додати дату
          </button>
        </div>

        {dates.length > 0 && (
          <ul className="date-list">
            {dates.map((d, i) => (
              <li key={`${d}-${i}`} className="date-item">
                <span className="date-item-label">{formatDate(d)}</span>
                <span className="date-item-actions">
                  <button
                    className="wb-btn-icon"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Вгору"
                  >
                    ↑
                  </button>
                  <button
                    className="wb-btn-icon"
                    onClick={() => move(i, 1)}
                    disabled={i === dates.length - 1}
                    aria-label="Вниз"
                  >
                    ↓
                  </button>
                  <button
                    className="wb-btn-icon wb-btn-danger"
                    onClick={() => remove(i)}
                    aria-label="Видалити"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <button className="wb-btn" onClick={goSelect} disabled={dates.length === 0}>
          {dates.length === 0 ? "Додайте хоча б одну дату" : "Обрати системи для співставлення"}
        </button>
      </section>
    </main>
  );
}
