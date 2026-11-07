/**
 * «Дослідження» — окремий розділ: редакційна шапка й зміст книжки.
 *
 * Рядок в акордеоні «Розвитку» обіцяв один екран, а вів у бібліотеку — тому
 * розділ має власну адресу, а кожен блок відкривається контентною сторінкою;
 * слова екрана приходять із його рядка `scenarios` (`docs/SCREEN_TEXTS.md`).
 * @module web-platform-dev/src/pages/research/ResearchPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import {
  RESEARCH_LANDING_SLUG,
  researchChapters,
  researchReadingMinutes,
  researchStatusLabel,
  type ResearchBlock,
} from "@wwwuabot/shared/research";
import type { ScreenTexts } from "@wwwuabot/shared/screens";
import { formatScreenText, screenText } from "@wwwuabot/shared/screens";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useScreenTexts } from "../screen-texts/useScreenTexts";
import { useResearchCatalog } from "./useResearchCatalog";

const SCREEN_KEY = "research";

const CHAPTER_NO = (index: number): string => String(index + 1).padStart(2, "0");

/** Рядок метаданих: лише те, що справді є, — без «0 хв · ·». */
function cardMeta(block: ResearchBlock, texts: ScreenTexts): string {
  const status = researchStatusLabel(block.dataStatus);
  return [
    block.readingTime > 0
      ? formatScreenText(texts, "research.readingMinutes", { n: String(block.readingTime) })
      : null,
    status,
    block.dataDate ? formatScreenText(texts, "research.meta.data", { date: block.dataDate }) : null,
  ]
    .filter((part): part is string => part !== null && part !== "")
    .join(" · ");
}

export function ResearchPage(): ReactElement {
  const { texts, ready } = useScreenTexts(SCREEN_KEY);
  const title = screenText(texts, "research.title");
  useScreenChrome({ title });
  const navigate = useNavigate();
  const { catalog, loading } = useResearchCatalog();

  const blocks = catalog?.blocks ?? [];
  const chapters = researchChapters(blocks);
  const minutes = researchReadingMinutes(blocks);

  if (!ready) return <div className="wb-page wb-research" />;

  return (
    <div className="wb-page wb-research">
      <header className="wb-research-hero">
        <p className="wb-research-kicker">{screenText(texts, "research.kicker")}</p>
        <h1 className="wb-research-title">{catalog?.title || title}</h1>
        <p className="wb-research-lead">{screenText(texts, "research.lead")}</p>
        {blocks.length > 0 && (
          <ul className="wb-research-facts">
            <li>
              <strong>{blocks.length}</strong>
              <span>{screenText(texts, "research.fact.blocks")}</span>
            </li>
            <li>
              <strong>{chapters.length}</strong>
              <span>{screenText(texts, "research.fact.chapters")}</span>
            </li>
            <li>
              <strong>{minutes}</strong>
              <span>{screenText(texts, "research.fact.minutes")}</span>
            </li>
          </ul>
        )}
      </header>

      {loading && (
        <div className="wb-research-loading" aria-hidden="true">
          <span className="wb-research-skeleton" />
          <span className="wb-research-skeleton" />
          <span className="wb-research-skeleton" />
        </div>
      )}

      {!loading &&
        chapters.map((chapter, index) => (
          <section className="wb-research-chapter" key={`${chapter.group}-${chapter.title}`}>
            <div className="wb-research-chapter__head">
              <span className="wb-research-chapter__no">{CHAPTER_NO(index)}</span>
              <h2 className="wb-research-chapter__title">{chapter.title}</h2>
              <span className="wb-research-chapter__count">{chapter.blocks.length}</span>
            </div>

            <ol className="wb-research-list">
              {chapter.blocks.map((block) => {
                const meta = cardMeta(block, texts);
                return (
                  <li key={block.slug}>
                    <button
                      type="button"
                      className="wb-research-card"
                      onClick={() => navigate(toWebPath(block.slug))}
                    >
                      <span className="wb-research-card__id">{block.id.toUpperCase()}</span>
                      <span className="wb-research-card__main">
                        <span className="wb-research-card__title">{block.title}</span>
                        {block.oneLiner && (
                          <span className="wb-research-card__lead">{block.oneLiner}</span>
                        )}
                        {block.keyFigures.length > 0 && (
                          <span className="wb-research-card__figures">
                            {block.keyFigures.slice(0, 3).map((figure) => (
                              <span className="wb-research-figure" key={figure.label}>
                                <span className="wb-research-figure__value">{figure.value}</span>
                                <span className="wb-research-figure__label">{figure.label}</span>
                              </span>
                            ))}
                          </span>
                        )}
                        {meta && <span className="wb-research-card__meta">{meta}</span>}
                      </span>
                      <Icon name="chevron-right" size={18} />
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

      {!loading && chapters.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="book" size={26} />
          </span>
          <p className="wb-empty-text">{screenText(texts, "research.empty")}</p>
        </div>
      )}

      <footer className="wb-research-footer">
        <p>{screenText(texts, "research.footer.text")}</p>
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => navigate(toWebPath(RESEARCH_LANDING_SLUG))}
        >
          {screenText(texts, "research.footer.cta")}
        </button>
      </footer>
    </div>
  );
}
