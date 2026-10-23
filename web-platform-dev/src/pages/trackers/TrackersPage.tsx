/**
 * «Трекери» — три поверхні одного екрана: **Мої** (запис), **Шаблони** й
 * **Публічні** (читання). Дерево, акордеон і смуга дій в усіх трьох однакові:
 * смуга не зникає при перемиканні вкладки.
 *
 * @module web-platform-dev/src/pages/trackers/TrackersPage
 */

import { useCallback, useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { ContextBar, useScreenChrome } from "@wwwuabot/ui/nav";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";
import { useDialog } from "@wwwuabot/ui/dialog";
import { Tabs, tabId, tabPanelId, type TabOption } from "@wwwuabot/ui/tabs";
import type { Tracker } from "@wwwuabot/shared/trackers";
import {
  TRACKERS_PATH,
  readCreateGroupId,
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
import { groupLibrary } from "./tracker-library";
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
  const dialog = useDialog();
  const state = useTrackers();
  const library = useTrackerLibrary();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<TrackerTab>("mine");
  // Два набори стану: власні групи й заголовки списків на читання — різні
  // сховища, бо це різні дерева; механізм акордеона той самий.
  const mineAccordion = useGroupAccordion();
  const libraryAccordion = useGroupAccordion("wb-tracker-library-open");
  const creating = readCreateIntent(params);
  const createGroupId = readCreateGroupId(params);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  const addMany = useCallback(
    async (sources: readonly string[]): Promise<boolean> => {
      const count = await state.addMany(sources);
      if (count > 0) await library.reload();
      return count > 0;
    },
    [state, library],
  );

  const accordion = tab === "mine" ? mineAccordion : libraryAccordion;
  /** Групи поточної поверхні — для однієї дії «Розгорнути/Згорнути». */
  const groupKeys = useMemo(
    () =>
      tab === "mine"
        ? tree.map((view) => view.group.id)
        : groupLibrary(tab === "templates" ? library.templates : library.publicTrackers).map(
            (group) => group.title,
          ),
    [tab, tree, library.templates, library.publicTrackers],
  );
  const allOpen = accordion.allOpen(groupKeys);

  function toggleAll(): void {
    accordion.setAll(groupKeys, !allOpen);
  }

  async function addGroup(): Promise<void> {
    const title = await dialog.prompt("Назва групи:", {
      validate: (value) => (value.trim() ? null : "Порожньо"),
    });
    if (title === null) return;
    const group = await state.createGroup(title.trim(), null);
    if (!group) return;
    // Створена група відразу на видноті — навіть без жодного трекера: інакше
    // дія не дає жодного видимого наслідку.
    setTab("mine");
    mineAccordion.setAll([group.id], true);
  }

  const addItems: MenuItem[] = [
    {
      key: "tracker",
      label: "Трекер",
      icon: "bar-chart",
      onSelect: () => {
        setAddOpen(false);
        navigate(withCreateIntent(TRACKERS_PATH));
      },
    },
    {
      key: "group",
      label: "Група",
      icon: "folder",
      onSelect: () => {
        setAddOpen(false);
        void addGroup();
      },
    },
  ];

  return (
    <div
      className="wb-page wb-trackers-page"
      style={{ "--matrix-cols": MATRIX_DAYS } as CSSProperties}
    >
      {/* Два рядки лишаються на видноті: назва екрана (AppBar) і вкладки з
          датами. Дні читають разом із числами, тож шапка таблиці мусить не
          зникати при прокрутці; дії ж живуть у контекстному футері. */}
      <div className="wb-trackers-head">
        <Tabs options={TABS} value={tab} onChange={setTab} label="Поверхні трекерів" />
        {tab === "mine" && rows.length > 0 && <TrackerDayHeader days={days} />}
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
            isOpen={libraryAccordion.isOpen}
            onToggle={libraryAccordion.toggle}
            onAdd={addFrom}
            onAddMany={addMany}
            onRetry={() => void library.reload()}
          />
        )}

        {tab === "public" && (
          <TrackersLibraryPanel
            items={library.publicTrackers}
            loading={library.loading}
            error={library.error}
            emptyText="Ще ніхто не відкрив своїх трекерів."
            isOpen={libraryAccordion.isOpen}
            onToggle={libraryAccordion.toggle}
            onAdd={addFrom}
            onAddMany={addMany}
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

            {!state.loading && !state.error && tree.length === 0 && (
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
                  onClick={() => setTab("templates")}
                >
                  До шаблонів
                </button>
              </div>
            )}

            {!state.loading && !state.error && tree.length > 0 && (
              <div className="wb-trackers-tree">
                {tree.map((view) => (
                  <TrackerGroupSection
                    key={view.group.id}
                    view={view}
                    depth={0}
                    cellsOf={cellsOf}
                    today={state.endDay}
                    saving={state.saving}
                    isOpen={mineAccordion.isOpen}
                    onToggle={mineAccordion.toggle}
                    onOpenTracker={(id) => navigate(trackerPath(id))}
                    onSave={save}
                    onCreateGroup={state.createGroup}
                    onUpdateGroup={state.updateGroup}
                    onDeleteGroup={state.deleteGroup}
                    onNewTracker={(groupId) => navigate(withCreateIntent(TRACKERS_PATH, groupId))}
                    onClearTrackers={state.clearGroup}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Дії екрана — над футером, а не в шапці таблиці: там вони забирали
          рядок у дат і зникали з очей при прокрутці. Смуга спільна для всіх
          трьох вкладок: це один екран, а не три. */}
      {!state.loading && !state.error && (
        <ContextBar
          label="Дії трекерів"
          actions={[
            { key: "groups", label: "Групи", icon: "folder", onSelect: () => setGroupsOpen(true) },
            {
              key: "expand",
              label: allOpen ? "Згорнути" : "Розгорнути",
              icon: allOpen ? "collapse" : "expand",
              disabled: groupKeys.length === 0,
              onSelect: toggleAll,
            },
            {
              key: "add",
              // «Створити», а не «Додати»: спершу питаємо, що саме — інакше
              // знак обіцяв би кнопку, якої за ним немає.
              label: "Створити",
              icon: "plus",
              primary: true,
              onSelect: () => setAddOpen(true),
            },
          ]}
        />
      )}

      {addOpen && (
        <MenuModal title="Що додати?" items={addItems} onClose={() => setAddOpen(false)} />
      )}

      {creating && (
        <MenuModal
          title="Новий трекер"
          variant="card"
          onClose={() => navigate(withoutCreateIntent(TRACKERS_PATH), { replace: true })}
          content={
            <TrackerCreateForm
              groups={state.groups}
              initialGroupId={createGroupId}
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
