/**
 * «Трекери» — **акордеон груп + матриця днів**: групи (тематики каталогу,
 * власні, підгрупи будь-якої глибини) — акордеони зі станом у
 * `localStorage`, згорнутий заголовок несе рекурсивний рахунок мірок;
 * усередині — матриця: назва веде на картку, сьогоднішня клітинка відкриває
 * швидкий запис, решта — історія.
 * @module web-platform-dev/src/pages/trackers/TrackersPage
 */

import { useCallback, useMemo, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useDialog } from "@wwwuabot/ui/dialog";
import type { Tracker } from "@wwwuabot/shared/trackers";
import {
  TRACKERS_PATH,
  readCreateIntent,
  trackerPath,
  withCreateIntent,
  withoutCreateIntent,
} from "@/app/routes";
import { useTrackers } from "./useTrackers";
import { useGroupAccordion } from "./useGroupAccordion";
import { TrackerCreateForm } from "./TrackerCreateForm";
import { TrackerGroupSection } from "./TrackerGroupSection";
import { groupRowsTree, matrixDays, toTrackerRows, trackerCells } from "./trackers-view";

/** Ширина матриці: стільки днів уміщується на 360px без горизонтального скролу. */
const MATRIX_DAYS = 5;

export function TrackersPage(): ReactElement {
  useScreenChrome({ title: "Трекери" });
  const state = useTrackers();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [params] = useSearchParams();
  const accordion = useGroupAccordion();
  const creating = readCreateIntent(params);

  const rows = toTrackerRows(state.trackers, state.entries, state.endDay);
  const days = useMemo(() => matrixDays(state.endDay, MATRIX_DAYS), [state.endDay]);
  const tree = useMemo(() => groupRowsTree(rows, state.groups), [rows, state.groups]);

  const cellsOf = useCallback(
    (tracker: Tracker) => trackerCells(tracker, state.entries, days),
    [state.entries, days],
  );

  const save = useCallback(
    (trackerId: number, value: number, note: string) => state.save(trackerId, value, note),
    [state],
  );

  async function addGroup(): Promise<void> {
    const title = await dialog.prompt("Назва групи:", {
      validate: (value) => (value.trim() ? null : "Порожньо"),
    });
    if (title !== null) await state.createGroup(title.trim(), null);
  }

  return (
    <div className="wb-page wb-trackers-page">
      {rows.length > 0 && (
        <section className="wb-tracker-day">
          <div className="wb-tracker-day-head">
            {/* `span`, а не `p`: бренд тримає абзаци на 14px з `!important`, і
                підпис-мітка ставав більшим за число, до якого він веде. */}
            <span className="wb-tracker-day-label">Сьогодні записано</span>
            <span className="wb-tracker-day-tools">
              <button
                type="button"
                className="wb-tracker-add wb-tracker-add--ghost"
                aria-label="Додати групу"
                onClick={() => void addGroup()}
              >
                <Icon name="folder" size={20} />
              </button>
              <button
                type="button"
                className="wb-tracker-add"
                aria-label="Додати трекер"
                onClick={() => navigate(withCreateIntent(TRACKERS_PATH))}
              >
                <Icon name="plus" size={22} />
              </button>
            </span>
          </div>
          <p className="wb-tracker-day-figure">
            <span className="wb-tracker-day-count">
              {rows.filter((row) => row.recordedToday).length}
            </span>
            <span className="wb-tracker-day-total">з {rows.length}</span>
          </p>
          <div className="wb-tracker-day-bar" aria-hidden="true">
            {rows.map((row) => (
              <span
                key={row.tracker.id}
                className={`wb-tracker-day-seg${row.recordedToday ? " wb-tracker-day-seg--on" : ""}`}
              />
            ))}
          </div>
        </section>
      )}

      {creating && (
        <TrackerCreateForm
          groups={state.groups}
          onCreate={(fields, groupId) => state.create(fields, groupId)}
          onCreated={(tracker) => navigate(trackerPath(tracker.id), { replace: true })}
          onCancel={() => navigate(withoutCreateIntent(TRACKERS_PATH), { replace: true })}
        />
      )}

      {state.loading && <p className="wb-text-muted">Завантаження…</p>}

      {!state.loading && state.error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-empty-text">{state.error}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => void state.reload()}>
            Повторити
          </button>
        </div>
      )}

      {!state.loading && !state.error && rows.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="bar-chart" size={32} />
          </span>
          <p className="wb-empty-text">Трекерів ще немає.</p>
          <p className="wb-text-muted">Стандартний набір з'явиться сам — або створіть свій.</p>
          <button
            type="button"
            className="wb-btn wb-btn-primary"
            onClick={() => navigate(withCreateIntent(TRACKERS_PATH))}
          >
            Створити трекер
          </button>
        </div>
      )}

      {!state.loading && !state.error && rows.length > 0 && (
        <div className="wb-trackers-tree">
          {tree.map((view) => (
            <TrackerGroupSection
              key={view.group.id}
              view={view}
              depth={0}
              trackers={state.trackers}
              cellsOf={cellsOf}
              today={state.endDay}
              saving={state.saving}
              isOpen={accordion.isOpen}
              onToggle={accordion.toggle}
              onOpenTracker={(id) => navigate(trackerPath(id))}
              onSave={save}
              onCreateGroup={state.createGroup}
              onUpdateGroup={state.updateGroup}
              onDeleteGroup={state.deleteGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
}
