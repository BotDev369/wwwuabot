import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app.store";
import { fetchScenario, type ScenarioConfig } from "@/shared/api/scenarios.api";

const FALLBACK_CONFIG: ScenarioConfig = {
  v: 1,
  meta: { title: "WWWUABot — Головна" },
  slots: {
    main: [
      { component: "Heading", props: { text: "Вітаємо на веб-платформі WWWUABot!" } },
      { component: "Button", props: { label: "Перейти на головну", href: "/" } },
    ],
  },
};

function DateInputBlock({
  label,
  buttonLabel,
  basePath,
}: {
  label: string;
  buttonLabel: string;
  basePath: string;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value) return;
    window.location.href = `${basePath}/${value}`;
  };

  return (
    <div className="date-input-block">
      <label className="date-input-label">{label}</label>
      <div className="date-input-row">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="date-input"
        />
        <button className="btn btn-inline" onClick={handleSubmit}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

export function HomePage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const [config, setConfig] = useState<ScenarioConfig | null>(null);

  useEffect(() => {
    const slug = window.location.pathname === "/" ? "__base__" : window.location.pathname.slice(1);

    fetchScenario(slug).then((cfg) => {
      if (cfg) {
        setConfig(cfg);
        setScenarioName(cfg.scenarioName ?? null);
      } else {
        setConfig(FALLBACK_CONFIG);
        setScenarioName(null);
      }
    });
  }, [setScenarioName]);

  const cfg = config ?? FALLBACK_CONFIG;

  return (
    <main>
      <section className="hero">
        {cfg.slots.main.map((block, i) => (
          <div key={i}>
            {block.component === "Heading" && <h1>{block.props.text as string}</h1>}
            {block.component === "Paragraph" && (
              <p className="hero-text">{block.props.text as string}</p>
            )}
            {block.component === "Button" && (
              <a className="btn" href={block.props.href as string}>
                {block.props.label as string}
              </a>
            )}
            {block.component === "DateInput" && (
              <DateInputBlock
                label={block.props.label as string}
                buttonLabel={block.props.buttonLabel as string}
                basePath={block.props.basePath as string}
              />
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
