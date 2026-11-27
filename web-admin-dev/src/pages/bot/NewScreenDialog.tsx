/**
 * «Новий екран»: ключ, тип і HTML для сценарію в поточному проєкті.
 *
 * @module web-admin-dev/src/pages/bot/NewScreenDialog
 */

import { useState } from "react";
import {
  createBotScenario,
  type BotScenarioRecord,
  type ScenarioKind,
} from "../../shared/api/scenarios-admin.api";
import { contentErrorMessage } from "../tenant/content-errors";
import labels from "../tenant/project-labels.json";

interface NewScreenDialogProps {
  /** Проєкт, у якому створюється екран. */
  tenantKey: string;
  /** Створений сценарій: список перечитує й картку відкриває сторінка. */
  onCreated: (record: BotScenarioRecord) => void;
  onClose: () => void;
}

export function NewScreenDialog({ tenantKey, onCreated, onClose }: NewScreenDialogProps) {
  const [lookup, setLookup] = useState("");
  const [kind, setKind] = useState<ScenarioKind>("widget");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(): Promise<void> {
    const key = lookup.trim();
    if (!key) {
      setError(labels.lookupRequired);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const record = await createBotScenario(
        key,
        kind === "widget"
          ? { kind: "widget", widget_html: html }
          : { kind: "rich", rich_html: html },
        tenantKey,
      );
      onCreated(record);
    } catch (e) {
      setError(contentErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h2 className="wb-modal-title">{labels.createTitle}</h2>
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            {labels.cancel}
          </button>
        </div>
        <div className="wb-modal-body wb-admin-form">
          <label className="wb-admin-field">
            <span className="wb-admin-label">{labels.lookup}</span>
            <input
              className="wb-input"
              placeholder={labels.lookupHint}
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
            />
          </label>
          <label className="wb-admin-field">
            <span className="wb-admin-label">{labels.kind}</span>
            <select
              className="wb-input"
              value={kind}
              onChange={(e) => setKind(e.target.value as ScenarioKind)}
            >
              <option value="widget">widget</option>
              <option value="rich">rich</option>
            </select>
          </label>
          <label className="wb-admin-field">
            <span className="wb-admin-label">{labels.html}</span>
            <textarea
              className="wb-textarea wb-admin-json wb-admin-json--page"
              rows={12}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
            />
          </label>
          {error && <p className="wb-admin-error">{error}</p>}
        </div>
        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            {labels.cancel}
          </button>
          <button className="wb-btn wb-btn-primary" onClick={() => void submit()} disabled={busy}>
            {busy ? labels.creating : labels.createSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
