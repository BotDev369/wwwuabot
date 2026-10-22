/**
 * «Трекери» — три поверхні в одному екрані: **Мої** (запис і порядок),
 * **Шаблони** (каталог) і **Публічні** (чужі відкриті визначення). Вносити
 * дані можна тільки в «Моїх»: там матриця днів, сьогодні першою колонкою;
 * решта — читання й «Додати».
 *
 * @module web-platform-dev/src/pages/trackers/TrackersPage
 */

import { useCallback, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { ContextBar, useScreenChrome } from "@wwwuabot/ui/nav";
import { MenuModal } from "@wwwuabot/ui/menu";
import { Tabs, tabId, tabPanelId, type TabOption } from "@wwwuabot/ui/tabs";
import type { Tracker } from "@wwwuabot/shared/trackers";
import {
  TRACKERS_PATH,
  readCreateIntent,
  trackerPath,
  withCreateIntent,
  withoutCreateIntent,
} from "@/app/routes";
import { useTrackers } from "./useTrackers";
import { useTrackerLibrary } from "./useTrackerLibrary";
import { useGroupAccordion } from "./useGroupAccordion";
import { TrackerCreateForm } from "./TrackerCreateForm";
import { TrackerGroupsModal } from "./TrackerGroupsModal";
import { TrackerGroupSection } from "./TrackerGroupSection";
import { TrackerDayHeader } from "./TrackerDayHeader";
import { TrackersLibraryPanel } from "./TrackersLibraryPanel";
import { groupRowsTree, matrixDays, trackerCells } from "./trackers-view";

/** Ширина матриці: стільки днів уміщується на 360px без горизонтального скролу. */
const MATRIX_DAYS = 4;

type TrackerTab = "mine" | "templates" | "public";

const TABS: readonly TabOption<TrackerTab>[] = [
  { key: "mine", label: "Мої" },
  { key: "templates", label: "Шаблони" },
  { key: "public", label: "Публічні" },
];

export function TrackersPage(): ReactElement {
  useScreenChrome({ title: "Трекери" });
  const state = useTrackers();
  const library = useTrackerLibrary();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<TrackerTab>("mine");
  const [ordering, setOrdering] = useState(false);
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

  const addFrom = useCallback(
    async (source: string): Promise<boolean> => {
      const added = await state.addFrom(source);
      // Прапорець «Додано» й `mine` приходять із сервера — список перечитуємо,
      // а не вгадуємо стан локально.
      if (added) await library.reload();
      return added !== null;
    },
    [state, library],
  );

  function switchTab(next: TrackerTab): void {
    setTab(next);
    // Порядок — це «Мої»; у списках на читання його немає, і режим не має
    // пережити перемикання вкладки.
    if (next !== "mine") setOrdering(false);
  }

  return (
    <div
      className="wb-page wb-trackers-page"
      style={{ "--matrix-cols": MATRIX_DAYS } as CSSProperties}
    >
      {/* Два рядки лишаються на видноті: назва екрана (AppBar) і вкладки з
          датами. Дні читають разом із числами, тож шапка таблиці мусить не
          зникати при прокрутці; дії ж живуть у контекстному футері. */}
      <div className="wb-trackers-head">
        <Tabs options={TABS} value={tab} onChange={switchTab} label="Поверхні трекерів" />
        {/* У режимі «Порядок» колонок дат немає — шапці нема що показати, і
            порожній рядок лише з'їдав би місце. */}
        {tab === "mine" && !ordering && rows.length > 0 && <TrackerDayHeader days={days} />}
      </div>

      <div
        id={tabPanelId(tab)}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        className="wb-trackers-panel"
      >
        {tab === "templates" && (
          <TrackersLibraryPanel
            items={library.templates}
            loading={library.loading}
            error={library.error}
            emptyText="Шаблонів не знайдено."
            onAdd={addFrom}
            onRetry={() => void library.reload()}
          />
        )}

        {tab === "public" && (
          <TrackersLibraryPanel
            items={library.publicTrackers}
            loading={library.loading}
            error={library.error}
            emptyText="Ще ніхто не відкрив своїх трекерів."
            onAdd={addFrom}
            onRetry={() => void library.reload()}
          />
        )}

        {tab === "mine" && (
          <>
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
                <p className="wb-text-muted">
                  Візьміть готову мірку з «Шаблонів» або створіть свою — у «Моїх» лишається тільки
                  те, що ви обрали.
                </p>
                <button
                  type="button"
                  className="wb-btn wb-btn-primary"
                  onClick={() => switchTab("templates")}
                >
                  До шаблонів
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
                    ordering={ordering}
                    isOpen={accordion.isOpen}
                    onToggle={accordion.toggle}
                    onMoveTracker={(id, direction) => void state.moveTracker(id, direction)}
                    onOpenTracker={(id) => navigate(trackerPath(id))}
                    onSave={save}
                    onCreateGroup={state.createGroup}
                    onUpdateGroup={state.updateGroup}
                    onDeleteGroup={state.deleteGroup}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Дії екрана — над футером, а не в шапці таблиці: там вони забирали
          рядок у дат і зникали з очей при прокрутці. */}
      {tab === "mine" && !state.loading && !state.error && (
        <ContextBar
          label="Дії трекерів"
          actions={[
            { key: "groups", label: "Групи", icon: "folder", onSelect: () => setGroupsOpen(true) },
            {
              key: "order",
              label: "Порядок",
              icon: "sort",
              active: ordering,
              disabled: rows.length === 0,
              onSelect: () => setOrdering((value) => !value),
            },
            {
              key: "add",
              label: "Додати трекер",
              icon: "plus",
              primary: true,
              onSelect: () => navigate(withCreateIntent(TRACKERS_PATH)),
            },
          ]}
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
    </div>
  );
}
