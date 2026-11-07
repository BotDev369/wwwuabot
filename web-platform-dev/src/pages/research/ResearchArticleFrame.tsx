/**
 * Рамка контентної сторінки дослідження: назад, прогрес і сусіди.
 *
 * Без неї блок дослідження — текст без орієнтирів: не видно розділу, скільки
 * лишилось і що читати далі. Каталог знає це, `page_data` — ні.
 *
 * @module web-platform-dev/src/pages/research/ResearchArticleFrame
 */

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import { researchBlockBySlug, researchNeighbours } from "@wwwuabot/shared/research";
import { screenText } from "@wwwuabot/shared/screens";
import { RESEARCH_PATH } from "@/app/routes";
import { useScreenTexts } from "../screen-texts/useScreenTexts";
import { useResearchCatalog } from "./useResearchCatalog";

/** Скільки відсотків сторінки прочитано — від прокрутки документа. */
function useReadingProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const read = (): void => {
      const root = document.documentElement;
      const height = root.scrollHeight - root.clientHeight;
      setProgress(height > 0 ? Math.min(100, Math.round((root.scrollTop / height) * 100)) : 0);
    };

    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  return progress;
}

interface ResearchArticleFrameProps {
  /** Адреса блоку — нею каталог знаходить його назву й сусідів. */
  slug: string;
  children: ReactNode;
}

export function ResearchArticleFrame({ slug, children }: ResearchArticleFrameProps): ReactElement {
  const navigate = useNavigate();
  const { catalog } = useResearchCatalog();
  // Слова рамки — з рядка `research`; поки вони їдуть, діти вже видно, а
  // підписи лишаються порожніми: стаття важливіша за напис над нею.
  const { texts } = useScreenTexts("research");
  const progress = useReadingProgress();

  const blocks = catalog?.blocks ?? [];
  const block = researchBlockBySlug(blocks, slug);
  const { previous, next } = researchNeighbours(blocks, slug);

  return (
    <div className="wb-article">
      <div className="wb-article-bar">
        <button type="button" className="wb-article-back" onClick={() => navigate(RESEARCH_PATH)}>
          <Icon name="arrow-left" size={16} />
          <span>{screenText(texts, "research.article.back")}</span>
        </button>
        {block && (
          <span className="wb-article-bar__meta">
            {block.groupTitle || screenText(texts, "research.article.back")} ·{" "}
            {block.id.toUpperCase()}
          </span>
        )}
        <span className="wb-article-bar__track" aria-hidden="true">
          <span className="wb-article-bar__fill" style={{ width: `${progress}%` }} />
        </span>
      </div>

      <div className="wb-article-body">{children}</div>

      {(previous || next) && (
        <nav className="wb-article-next" aria-label={screenText(texts, "research.article.aria")}>
          {previous ? (
            <button
              type="button"
              className="wb-article-next__link wb-article-next__link--prev"
              onClick={() => navigate(toWebPath(previous.slug))}
            >
              <span className="wb-article-next__label">
                {screenText(texts, "research.article.prev")}
              </span>
              <span className="wb-article-next__title">{previous.title}</span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              type="button"
              className="wb-article-next__link wb-article-next__link--next"
              onClick={() => navigate(toWebPath(next.slug))}
            >
              <span className="wb-article-next__label">
                {screenText(texts, "research.article.next")}
              </span>
              <span className="wb-article-next__title">{next.title}</span>
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
