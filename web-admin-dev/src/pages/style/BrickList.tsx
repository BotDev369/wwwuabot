/**
 * Кирпичики: справжня розмітка продукту в рамці, з іменами класів.
 *
 * Прев'ю — не макет: у рамці стоїть та сама розмітка, що на екрані, тож
 * довідник показує продукт таким, яким він є.
 *
 * @module web-admin-dev/src/pages/style/BrickList
 */

import type { BrickGroup } from "./previews";

export function BrickList({ groups }: { groups: BrickGroup[] }) {
  if (!groups.length) return <p className="st-empty">Нічого не знайдено.</p>;

  return (
    <>
      {groups.map((group) => (
        <section className="st-group" key={group.id}>
          <h2 className="st-group-title">{group.title}</h2>
          <div className="st-bricks">
            {group.items.map((brick) => (
              <article className="st-brick" key={brick.id}>
                <header className="st-brick-head">
                  <span className="st-brick-title">{brick.title}</span>
                  <span className="st-brick-classes">
                    {brick.classes.map((name) => (
                      <code className="st-class-name" key={`${brick.id}-${name}`}>
                        .{name}
                      </code>
                    ))}
                  </span>
                </header>
                <div className="st-brick-demo">{brick.node}</div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
