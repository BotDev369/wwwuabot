/**
 * SiteEditorPage — редактор сайту: панель керування + полотно сторінки.
 *
 * Тут лише композиція. Стан і дії — у `site-editor/useSiteEditor`, розмітка —
 * у `site-editor/SiteEditorPanel` і `site-editor/CanvasPane`.
 *
 * @module web-platform-dev/src/pages/SiteEditorPage
 */

import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { CanvasPane } from "./site-editor/CanvasPane";
import { SiteEditorPanel } from "./site-editor/SiteEditorPanel";
import { useSiteEditor } from "./site-editor/useSiteEditor";

export function SiteEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const api = useSiteEditor(slug);

  if (api.loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton site-editor-skeleton" />
        <p className="wb-text-muted">Завантаження...</p>
      </div>
    );
  }

  if (api.error || !api.site) {
    return (
      <div className="wb-empty">
        <Icon name="x" size={32} />
        <p className="wb-text-red">{api.error ?? "Сайт не знайдено"}</p>
        <button className="wb-btn wb-btn-secondary" onClick={() => navigate("/sites")}>
          Назад до списку
        </button>
      </div>
    );
  }

  return (
    <div className="site-editor-page">
      <SiteEditorPanel api={api} site={api.site} />
      <CanvasPane api={api} site={api.site} />
    </div>
  );
}
