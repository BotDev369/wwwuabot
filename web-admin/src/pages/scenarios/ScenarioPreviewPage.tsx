import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { readScenario, deleteScenario, type ScenarioRow } from "../../shared/api/scenarios.api";
import { blockRegistry } from "../../features/editor/blocks/registry";
import { RichBlocksView } from "../../features/editor/blocks/RichBlocksView";
import { PageTopbar } from "../../layout/PageTopbar";

type LoadState = "loading" | "ready" | "error" | "notfound";

export function ScenarioPreviewPage() {
  const { codeword = "" } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<ScenarioRow | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    readScenario(codeword)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState("notfound");
          return;
        }
        setRow(data);
        setState("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg((e as Error).message);
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [codeword]);

  const isRich = row?.rich_message === "true" || row?.rich_message === "1";

  // Rich-блоки для прев'ю
  const richBlocks = useMemo(() => {
    if (!isRich || !row?.rich_data) return [];
    try {
      const parsed = JSON.parse(row.rich_data);
      if (!Array.isArray(parsed)) return [];
      return blockRegistry.deserialize(parsed);
    } catch {
      return [];
    }
  }, [row, isRich]);

  // Кнопки для photo-сценарію
  const buttonRows = useMemo<{ text: string }[][]>(() => {
    if (!row?.buttons) return [];
    try {
      const parsed = JSON.parse(row.buttons) as unknown;
      return Array.isArray(parsed) ? (parsed as { text: string }[][]) : [];
    } catch {
      return [];
    }
  }, [row]);

  const photoUrl = row?.photo_url;
  const isPhotoUrl = typeof photoUrl === "string" && /^https?:\/\//.test(photoUrl);

  async function handleDelete() {
    if (!window.confirm(`Видалити сценарій «${codeword}» назавжди?`)) return;
    try {
      await deleteScenario(codeword);
      navigate("/scenarios");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setState("error");
    }
  }

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <button
            className="btn btn--secondary"
            onClick={() => navigate("/scenarios")}
            title="До списку"
          >
            ←
          </button>
          <h1 className="topbar-title scn-preview-title">{codeword}</h1>
          {row && (
            <span className={`scn-badge${isRich ? " scn-badge--rich" : ""}`}>
              {isRich ? "Rich" : "Photo"}
            </span>
          )}
        </div>
        <div className="topbar-right">
          <button className="btn btn--danger" onClick={handleDelete}>
            Видалити
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => navigate(`/scenarios/${encodeURIComponent(codeword)}/edit`)}
          >
            Форма
          </button>
          <button
            className="btn btn--primary"
            onClick={() => navigate(`/editor?cw=${encodeURIComponent(codeword)}`)}
          >
            Rich
          </button>
        </div>
      </PageTopbar>

      <div className="scn-preview-body">
        {state === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження сценарію…</p>
          </div>
        ) : state === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Помилка: {errorMsg}</p>
          </div>
        ) : state === "notfound" ? (
          <div className="empty-state">
            <p className="empty-state-text">Сценарій «{codeword}» не знайдено в базі.</p>
          </div>
        ) : (
          <div className="tg-preview">
            <div className="tg-message">
              {isRich ? (
                <RichBlocksView blocks={richBlocks} />
              ) : (
                <>
                  {isPhotoUrl && <img className="tg-photo" src={photoUrl!} alt="" />}
                  {row?.caption_top && <div className="tg-caption">{row.caption_top}</div>}
                  {row?.caption_mid && <div className="tg-caption">{row.caption_mid}</div>}
                  {row?.caption_bot && <div className="tg-caption">{row.caption_bot}</div>}
                  {buttonRows.length > 0 && (
                    <div className="tg-buttons">
                      {buttonRows.map((rowBtns, i) => (
                        <div className="tg-btn-row" key={i}>
                          {rowBtns.map((b, j) => (
                            <span className="tg-btn" key={j}>
                              {b.text}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
