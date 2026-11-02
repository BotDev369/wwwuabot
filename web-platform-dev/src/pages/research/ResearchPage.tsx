/**
 * «Дослідження» — окремий розділ: редакційна шапка й зміст книжки.
 *
 * Рядок в акордеоні «Розвитку» обіцяв один екран, а вів у бібліотеку — тому
 * розділ має власну адресу, а кожен блок відкривається контентною сторінкою.
 *
 * @module web-platform-dev/src/pages/research/ResearchPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import {
  RESEARCH_LANDING_SLUG,
  RESEARCH_TITLE,
  researchChapters,
  researchReadingMinutes,
  researchStatusLabel,
  type ResearchBlock,
} from "@wwwuabot/shared/research";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useResearchCatalog } from "./useResearchCatalog";

const CHAPTER_NO = (index: number): string => String(index + 1).padStart(2, "0");

/** Рядок метаданих: лише те, що справді є, — без «0 хв · ·». */
function cardMeta(block: ResearchBlock): string {
  const status = researchStatusLabel(block.dataStatus);
  return [
    block.readingTime > 0 ? `${block.readingTime} хв читання` : null,
    status,
    block.dataDate ? `дані ${block.dataDate}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

export function ResearchPage(): ReactElement {
  useScreenChrome({ title: "Дослідження" });
  const navigate = useNavigate();
  const { catalog, loading } = useResearchCatalog();

  const blocks = catalog?.blocks ?? [];
  const chapters = researchChapters(blocks);
  const minutes = researchReadingMinutes(blocks);
  const title = catalog?.title || RESEARCH_TITLE;

  return (
    <div className="wb-page wb-research">
      <header className="wb-research-hero">
        <p className="wb-research-kicker">Дослідження</p>
        <h1 className="wb-research-title">{title}</h1>
        <p className="wb-research-lead">
          Скільки людей у світі вірять, у що саме і як це змінюється. Кожен блок — окрема контентна
          сторінка з датами, джерелами й цифрами, які можна перевірити.
        </p>
        {blocks.length > 0 && (
          <ul className="wb-research-facts">
            <li>
              <strong>{blocks.length}</strong>
              <span>блоків</span>
            </li>
            <li>
              <strong>{chapters.length}</strong>
              <span>розділів</span>
            </li>
            <li>
              <strong>{minutes}</strong>
              <span>хвилин читання</span>
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
                const meta = cardMeta(block);
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
          <p className="wb-empty-text">Дослідження ще не опубліковане.</p>
        </div>
      )}

      <footer className="wb-research-footer">
        <p>
          Методологія, повний список джерел і кодекс нейтральності — на сторінці дослідження. Кожен
          блок посилається на першоджерело, а не на переказ.
        </p>
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => navigate(toWebPath(RESEARCH_LANDING_SLUG))}
        >
          Методологія й джерела
        </button>
      </footer>
    </div>
  );
}
