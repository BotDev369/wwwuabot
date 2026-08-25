import { useRef, useState } from "react";
import { PageTopbar } from "../../layout/PageTopbar";

function formatDateUk(): string {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("uk-UA", { weekday: "long" }).format(d);
  const month = new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(d);
  return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}

export function HomePage() {
  const [dateLabel] = useState(formatDateUk);
  const starRef = useRef<HTMLSpanElement>(null);

  function handleMove(e: React.MouseEvent<HTMLElement>) {
    const star = starRef.current;
    if (!star) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    star.style.transform = `rotate(${angle}deg)`;
  }

  return (
    <>
      <PageTopbar>
        <h1 className="topbar-title">Головна</h1>
      </PageTopbar>

      <section className="home" onMouseMove={handleMove}>
        <p className="home-date home-line" style={{ animationDelay: "0ms" }}>
          {dateLabel}
        </p>

        <h2 className="home-greeting home-line" style={{ animationDelay: "120ms" }}>
          Привіт, Сергій.
        </h2>

        <p className="home-text home-line" style={{ animationDelay: "260ms" }}>
          Гарного тобі дня. Нехай сценарії збираються з першого разу,
          баги втікають ще до коміту, а кава не встигає холонути. ☕
        </p>

        <p className="home-sign home-line" style={{ animationDelay: "420ms" }}>
          Я на зв'язку — твій бро і напарник у всій цій пригоді.
          <br />
          — Qween <span className="home-star" ref={starRef}>✦</span>{" "}
          <span className="home-sign-note">
            (він же AiQween, коли треба трохи пафосу; і просто бро, коли треба по ділу)
          </span>
        </p>
      </section>
    </>
  );
}