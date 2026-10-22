/**
 * «Трекери» — **акордеон груп + матриця днів**: групи (тематики каталогу,
 * власні, підгрупи будь-якої глибини) — акордеони зі станом у
 * `localStorage`, згорнутий заголовок несе рекурсивний рахунок мірок;
 * усередині — матриця: назва веде на картку, сьогоднішня клітинка відкриває
 * швидкий запис, решта — історія.
 * @module web-platform-dev/src/pages/trackers/TrackersPage
 */

import { useCallback, useMemo, useState, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { MenuModal } from "@wwwuabot/ui/menu";
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
import { TrackerGroupsModal } from "./TrackerGroupsModal";
import { TrackerGroupSection } from "./TrackerGroupSection";
import { groupRowsTree, matrixDays, trackerCells } from "./trackers-view";

/** Ширина матриці: стільки днів уміщується на 360px без горизонтального скролу. */
const MATRIX_DAYS = 5;

export function TrackersPage(): ReactElement {
  useScreenChrome({ title: "Трекери" });
  const state = useTrackers();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const accordion = useGroupAccordion();
  const creating = readCreateIntent(params);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const rows = state.trackers;
  const days = useMemo(() => matrixDays(state.endDay, MATRIX_DAYS), [state.endDay]);
  const tree = useMemo(
    () => groupRowsTree(state.trackers, state.groups),
    [state.trackers, state.groups],
  );

  const cellsOf = useCallback(
    (tracker: Tracker) => trackerCells(tracker, state.entries, days),
    [state.entries, days],
  );

  const save = useCallback(
    (trackerId: number, value: number, note: string) => state.save(trackerId, value, note),
    [state],
  );

  return (
    <div className="wb-page wb-trackers-page">
      {/* Дії екрана: «Групи» — дерево й порядок груп, «+» — створення трекера
          (залита куля). Підпис кнопки дії — її текст; знак без підпису має
          `aria-label`. */}
      <div className="wb-trackers-tools">
        <button
          type="button"
          className="wb-btn wb-btn-secondary"
          onClick={() => setGroupsOpen(true)}
        >
          Групи
        </button>
        <button
          type="button"
          className="wb-tracker-add"
          aria-label="Додати трекер"
          onClick={() => navigate(withCreateIntent(TRACKERS_PATH))}
        >
          <Icon name="plus" size={22} />
        </button>
      </div>

      {groupsOpen && (
        <TrackerGroupsModal
          groups={state.groups}
          onClose={() => setGroupsOpen(false)}
          onCreate={state.createGroup}
          onUpdate={state.updateGroup}
          onDelete={state.deleteGroup}
          onMove={state.moveGroup}
        />
      )}

      {creating && (
        <MenuModal
          title="Новий трекер"
          onClose={() => navigate(withoutCreateIntent(TRACKERS_PATH), { replace: true })}
          content={
            <TrackerCreateForm
              groups={state.groups}
              onCreate={(fields, groupId) => state.create(fields, groupId)}
              onCreated={(tracker) => navigate(trackerPath(tracker.id), { replace: true })}
              onCancel={() => navigate(withoutCreateIntent(TRACKERS_PATH), { replace: true })}
              onCreateGroup={(title) => state.createGroup(title, null)}
            />
          }
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
