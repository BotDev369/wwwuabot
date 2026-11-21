/**
 * «Люди і події»: три акордеони — групи, люди, події. Кожен рядок має
 * чекбокс, тож для співставлення можна обрати будь-який склад. Тут же повний
 * CRUD: додати, змінити, видалити людину, подію або групу.
 *
 * @module web-platform-dev/src/pages/analysis/AnalysisPeoplePage
 */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { LENSES } from "@wwwuabot/shared/qualities";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import {
  deleteAnalysisSet,
  deleteMyDate,
  fetchAnalysisSets,
  fetchMyDates,
  saveAnalysisSet,
  saveMyDate,
  type AnalysisSet,
  type AnalysisSetItem,
} from "@wwwuabot/ui/analysis/api";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { ANALYSIS_COMPARE_PATH, ANALYSIS_PATH } from "@/app/routes";
import { PeopleAdder, PeopleRow } from "./PeopleRow";
import { humanDate, kindOf, type Draft, type Kind } from "./people-model";

const LENS_IDS = LENSES.map((lens) => lens.id).join(",");

/** Посилання на співставлення складу: рівні рахуються там, не тут. */
function compareHref(items: readonly AnalysisSetItem[], dates: readonly MyDate[]): string {
  const params = new URLSearchParams();
  params.set("dates", items.map((one) => one.date).join(","));
  params.set("labels", items.map((one) => one.name).join("|"));
  params.set(
    "kinds",
    items
      .map((item) => {
        const saved = dates.find((one) => one.date === item.date && one.name === item.name);
        return saved?.type === "event" ? "event" : "person";
      })
      .join(","),
  );
  params.set("lenses", LENS_IDS);
  return `${ANALYSIS_COMPARE_PATH}/result?${params.toString()}`;
}

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function AnalysisPeoplePage(): ReactElement {
  useScreenChrome({ title: "Люди і події" });
  const [dates, setDates] = useState<MyDate[]>([]);
  const [sets, setSets] = useState<AnalysisSet[]>([]);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ date: "", name: "" });
  const [newPerson, setNewPerson] = useState<Draft>({ date: "", name: "" });
  const [newEvent, setNewEvent] = useState<Draft>({ date: "", name: "" });

  function reload(): void {
    fetchMyDates()
      .then(setDates)
      .catch((failure: Error) => setError(failure.message));
    fetchAnalysisSets()
      .then(setSets)
      .catch((failure: Error) => setError(failure.message));
  }

  useEffect(() => {
    reload();
  }, []);

  const people = dates.filter((one) => kindOf(one) === "person");
  const events = dates.filter((one) => kindOf(one) === "event");

  function selectedItems(): AnalysisSetItem[] {
    const items: AnalysisSetItem[] = [];
    for (const set of sets) {
      if (picked.includes(`group:${set.id}`)) items.push(...set.items);
    }
    for (const one of dates) {
      if (picked.includes(`item:${one.id}`)) items.push({ date: one.date, name: one.name });
    }
    const seen = new Set<string>();
    return items.filter((one) => {
      const key = `${one.date}|${one.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function toggle(key: string): void {
    setPicked((current) =>
      current.includes(key) ? current.filter((one) => one !== key) : [...current, key],
    );
  }

  function saveGroup(): void {
    const items = selectedItems();
    const editing = sets.find((one) => one.id === editingGroup);
    const finalItems = editing && items.length === 0 ? editing.items : items;
    if (!groupName.trim() || finalItems.length === 0) return;
    setError("");
    saveAnalysisSet({
      id: editingGroup ?? newId("ag"),
      name: groupName.trim(),
      items: finalItems,
    })
      .then(() => {
        setGroupName("");
        setEditingGroup(null);
        reload();
      })
      .catch((failure: Error) => setError(failure.message));
  }

  /** Правка групи починається з її складу: інакше перший же новий вибір губить старих. */
  function startGroupEdit(set: AnalysisSet): void {
    setEditingGroup(set.id);
    setGroupName(set.name);
    setPicked(
      dates
        .filter((one) => set.items.some((item) => item.date === one.date && item.name === one.name))
        .map((one) => `item:${one.id}`),
    );
  }

  function removeGroup(id: string): void {
    setError("");
    deleteAnalysisSet(id)
      .then(() => {
        setPicked((current) => current.filter((one) => one !== `group:${id}`));
        reload();
      })
      .catch((failure: Error) => setError(failure.message));
  }

  function addItem(kind: Kind): void {
    const source = kind === "person" ? newPerson : newEvent;
    if (!isValidDate(source.date)) return;
    setError("");
    saveMyDate({ date: source.date, name: source.name.trim(), type: kind })
      .then(() => {
        if (kind === "person") setNewPerson({ date: "", name: "" });
        else setNewEvent({ date: "", name: "" });
        reload();
      })
      .catch((failure: Error) => setError(failure.message));
  }

  function startEdit(one: MyDate): void {
    setEditingItem(one.id);
    setDraft({ date: one.date, name: one.name });
  }

  function saveEdit(one: MyDate): void {
    if (!isValidDate(draft.date)) return;
    setError("");
    saveMyDate({ id: one.id, date: draft.date, name: draft.name, type: kindOf(one) })
      .then(() => {
        setEditingItem(null);
        reload();
      })
      .catch((failure: Error) => setError(failure.message));
  }

  function removeItem(id: string): void {
    setError("");
    deleteMyDate(id)
      .then(() => {
        setPicked((current) => current.filter((one) => one !== `item:${id}`));
        reload();
      })
      .catch((failure: Error) => setError(failure.message));
  }

  function rows(list: readonly MyDate[]): ReactElement[] {
    return list.map((one) => (
      <PeopleRow
        key={one.id}
        one={one}
        picked={picked.includes(`item:${one.id}`)}
        editing={editingItem === one.id}
        draft={draft}
        onToggle={() => toggle(`item:${one.id}`)}
        onStartEdit={() => startEdit(one)}
        onDraft={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSave={() => saveEdit(one)}
        onCancel={() => setEditingItem(null)}
        onRemove={() => removeItem(one.id)}
      />
    ));
  }

  const chosen = selectedItems();

  return (
    <div className="wb-page wb-page-scroll">
      <div className="an-hub">
        <a className="an-back" href={ANALYSIS_PATH}>
          <Icon name="arrow-left" size={16} />
          До розділів
        </a>

        <header className="an-hero an-hero--slim">
          <h1 className="an-hero__title">Люди і події</h1>
          <p className="an-hero__lead">
            Групи, люди й події. Позначайте потрібні чекбоксами — і беріть у співставлення будь-який
            склад.
          </p>
        </header>

        {error && <p className="an-empty">{error}</p>}

        {chosen.length > 0 && (
          <section className="an-pick">
            <p className="an-pick__hint">Обрано: {chosen.length}</p>
            <div className="an-tools">
              {chosen.length >= 2 && (
                <Link className="wb-btn wb-btn-primary" to={compareHref(chosen, dates)}>
                  <Icon name="compare" size={16} />
                  Співставити обрані
                </Link>
              )}
              <button type="button" className="an-tool" onClick={() => setPicked([])}>
                Зняти вибір
              </button>
            </div>
          </section>
        )}

        <details className="an-fold">
          <summary className="an-fold__summary">
            <span className="an-fold__title">Групи</span>
            <span className="an-fold__count">{sets.length}</span>
            <Icon name="chevron-down" size={18} className="an-quality__caret" />
          </summary>
          <div className="an-fold__body">
            <div className="an-row">
              <label className="an-field">
                <span className="an-field__label">
                  {editingGroup ? "Нова назва групи" : "Назва групи"}
                </span>
                <input
                  className="an-input"
                  type="text"
                  value={groupName}
                  placeholder="Наприклад, команда"
                  onChange={(event) => setGroupName(event.target.value)}
                />
              </label>
              <div className="an-tools">
                <button
                  type="button"
                  className="wb-btn wb-btn-primary"
                  disabled={!groupName.trim() || (chosen.length === 0 && !editingGroup)}
                  onClick={saveGroup}
                >
                  {editingGroup ? "Зберегти групу" : "Створити групу"}
                </button>
                {editingGroup && (
                  <button
                    type="button"
                    className="an-tool"
                    onClick={() => {
                      setEditingGroup(null);
                      setGroupName("");
                    }}
                  >
                    Скасувати
                  </button>
                )}
              </div>
              <p className="an-pick__hint">
                Група збирається з позначених людей і подій. Порожню групу не створюємо.
              </p>
            </div>

            {sets.length === 0 ? (
              <p className="an-empty">Груп ще немає.</p>
            ) : (
              <div className="an-people">
                {sets.map((set) => (
                  <div className="an-person-line" key={set.id}>
                    <label className="an-person an-person--pick">
                      <input
                        type="checkbox"
                        checked={picked.includes(`group:${set.id}`)}
                        aria-label={`Обрати групу ${set.name || "Без назви"}`}
                        onChange={() => toggle(`group:${set.id}`)}
                      />
                      <span className="an-person__name">{set.name || "Без назви"}</span>
                      <span className="an-person__date">{set.items.length} у складі</span>
                    </label>

                    <div className="an-tools">
                      <Link className="an-tool" to={compareHref(set.items, dates)}>
                        <Icon name="compare" size={16} />
                        Співставити
                      </Link>
                      <button type="button" className="an-tool" onClick={() => startGroupEdit(set)}>
                        <Icon name="settings" size={16} />
                        Змінити
                      </button>
                      <button type="button" className="an-tool" onClick={() => removeGroup(set.id)}>
                        <Icon name="close" size={16} />
                        Видалити
                      </button>
                    </div>

                    <p className="an-pick__hint">
                      {set.items.map((one) => one.name || humanDate(one.date)).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="an-fold">
          <summary className="an-fold__summary">
            <span className="an-fold__title">Люди</span>
            <span className="an-fold__count">{people.length}</span>
            <Icon name="chevron-down" size={18} className="an-quality__caret" />
          </summary>
          <div className="an-fold__body">
            {people.length === 0 ? (
              <p className="an-empty">Людей ще немає.</p>
            ) : (
              <div className="an-people">{rows(people)}</div>
            )}
            <PeopleAdder
              kind="person"
              draft={newPerson}
              onDraft={(patch) => setNewPerson((current) => ({ ...current, ...patch }))}
              onAdd={() => addItem("person")}
            />
          </div>
        </details>

        <details className="an-fold">
          <summary className="an-fold__summary">
            <span className="an-fold__title">Події</span>
            <span className="an-fold__count">{events.length}</span>
            <Icon name="chevron-down" size={18} className="an-quality__caret" />
          </summary>
          <div className="an-fold__body">
            {events.length === 0 ? (
              <p className="an-empty">Подій ще немає.</p>
            ) : (
              <div className="an-people">{rows(events)}</div>
            )}
            <PeopleAdder
              kind="event"
              draft={newEvent}
              onDraft={(patch) => setNewEvent((current) => ({ ...current, ...patch }))}
              onAdd={() => addItem("event")}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
