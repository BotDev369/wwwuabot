/**
 * Повний перелік класів дизайн-системи — по файлах і розділах.
 *
 * Це та половина інвентаря, яку неможливо тримати руками: класи народжуються в
 * CSS. Класи з прев'ю позначені точкою.
 *
 * @module web-admin-dev/src/pages/style/ClassList
 */

import { CLASS_NAMES, PREVIEWED_CLASSES, type ClassesByFile } from "./useStyleInventory";

export function ClassList({ classes }: { classes: ClassesByFile }) {
  const files = Object.keys(classes).sort();
  // Лише ті прев'ю, що справді є класами: у списку кирпичиків стоять і теги
  // (`h1`), і вони не мають рахуватись як клас із прикладом.
  const previewed = CLASS_NAMES.filter((name) => PREVIEWED_CLASSES.has(name)).length;

  if (!files.length) return <p className="st-empty">Нічого не знайдено.</p>;

  return (
    <>
      <p className="st-stat-label">
        Усього класів у CSS — {CLASS_NAMES.length}; з живим прикладом на вкладці «Кирпичики» —{" "}
        {previewed} (такі позначені точкою).
      </p>

      <div className="st-files">
        {files.map((file) => {
          const groups = classes[file];
          const count = new Set(groups.flatMap((g) => g.names)).size;
          return (
            <section className="st-file" key={file}>
              <header className="st-brick-head">
                <span className="st-file-name">{file}</span>
                <span className="st-file-count">{count} класів</span>
              </header>
              {groups.map((group) => (
                <div key={`${file}-${group.section}`}>
                  {group.section && <p className="st-section-name">{group.section}</p>}
                  <span className="st-names">
                    {group.names.map((name) => (
                      <code
                        className="st-class-name"
                        key={`${file}-${group.section}-${name}`}
                        title={PREVIEWED_CLASSES.has(name) ? "Є живий приклад" : undefined}
                      >
                        {PREVIEWED_CLASSES.has(name) ? `● ${name}` : name}
                      </code>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
