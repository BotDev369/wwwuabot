/**
 * Список токенів: значення трьох шарів і те, що стоїть на екрані зараз.
 *
 * Колонка «зараз» читається з живого `<html>`, тож довідник не розходиться з
 * екраном після перемикання схеми чи палітри.
 *
 * @module web-admin-dev/src/pages/style/TokenList
 */

import { Swatch } from "./Swatch";
import { groupTokens, type LocalToken, type StyleToken } from "./useStyleInventory";

interface TokenListProps {
  tokens: StyleToken[];
  locals: LocalToken[];
  live: Record<string, string>;
}

function Value({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "palette" | "live";
}) {
  if (!value) return null;
  const className = `st-value${tone === "palette" ? " st-value--palette" : ""}`;
  return (
    <span className={className} title={value}>
      <span className="st-value-key">{label}</span>
      {value}
    </span>
  );
}

export function TokenList({ tokens, locals, live }: TokenListProps) {
  const groups = groupTokens(tokens);

  if (!groups.length) return <p className="st-empty">Нічого не знайдено.</p>;

  return (
    <>
      {groups.map((group) => (
        <section className="st-group" key={group.section}>
          <h2 className="st-group-title">{group.section}</h2>
          <div className="st-tokens">
            {group.items.map((token) => (
              <div className="st-token" key={token.name}>
                <Swatch value={token.light || token.dark || token.palette} />
                <span className="st-token-name">{token.name}</span>
                <span className="st-values">
                  <Value label="світла" value={token.light} />
                  <Value label="темна" value={token.dark} />
                  {token.palette && <Value label="палітра" value={token.palette} tone="palette" />}
                  {token.paletteDark && (
                    <Value label="палітра тьм." value={token.paletteDark} tone="palette" />
                  )}
                  {live[token.name] && (
                    <span className="st-value st-value--live">
                      <span className="st-value-key">зараз</span>
                      {live[token.name]}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {locals.length > 0 && (
        <section className="st-group">
          <h2 className="st-group-title">Місцеві мірки компонентів</h2>
          <div className="st-tokens">
            {locals.map((token, index) => (
              // Той самий токен того самого правила може бути оголошений двічі
              // (у базовому правилі й у `@media`) — ключ мусить це терпіти.
              <div
                className="st-token"
                key={`${token.file}:${token.selector}:${token.name}:${index}`}
              >
                <Swatch value={token.value} />
                <span className="st-token-name">{token.name}</span>
                <span className="st-values">
                  <Value label="значення" value={token.value} />
                  <Value label="правило" value={token.selector} />
                  <Value label="файл" value={token.file} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
