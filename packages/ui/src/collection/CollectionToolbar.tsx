/**
 * Смуга керування колекцією: пошук, вибори (порядок, групи, фільтр, вигляд),
 * перемикач і чипи вибраного.
 *
 * Це **спільний кирпичик**, а не смуга нотаток (вона була нею до 18.09.2026):
 * пошук, сортування, групування, фільтр за хештегами й вибір розкладки
 * потрібні кожному списку — нотаткам, контактам, товарам, новинам. Тому тут
 * немає ні слова «нотатка», ні варіантів сортування: **склад** виборів знає
 * екран (він один знає свої поля), а **вигляд і поведінка** — цей кирпичик.
 *
 * Порядок у ряду — пошук ліворуч, клітинки поруч праворуч. Поле пошуку в
 * спокої завширшки зі власний підпис («Пошук») і **розкривається** на фокус
 * або запит: порожнє поле на всю ширину забирало місце саме в тих клітинок, за
 * якими людина приходить (правило 18). Ряд **не переноситься**: розкрите поле
 * забирає лише вільний простір, а клітинки лишаються на своєму місці — інакше
 * на фокусі вони стрибали на другий рядок, і смуга «переїжджала» рівно тоді,
 * коли людина зібралась друкувати. Чипи вибраного — окремий ряд **під** смугою:
 * вони не клітинки керування, а те, що ці клітинки змінили.
 *
 * Поле пошуку — **один** контрол, і контрол тут саме поле: у спокої навколо
 * нього немає ні заливки, ні рамки (поруч стоять клітинки, і залите поле
 * читалось як ще одна кнопка), а на фокусі навколо місця, де пишуть,
 * з'являється заливка з розмитим контуром. Іконка в цьому не бере участі —
 * вона лише стоїть поруч. ✕ у полі — свій, а не нативний: нативний у WebView
 * малюється окремою коробкою і не піддається стилю.
 *
 * Мірка ряду — 32px, а не планка пальця 44px: у смузі чотири контроли в ряд, і
 * високий ряд забирав у списку більше екрана, ніж сам список, до якого веде.
 *
 * Вибори **не** випадають списком (правило 4): кожен відкриває ту саму
 * повноекранну поверхню, що й меню профілю (`MenuModal`), і вибраний варіант
 * позначений галочкою — бо це стан, а не перехід. Самі клітинки — без підпису
 * й без заливки: та сама клітинка, що у вкладок композера (одне правило на
 * всіх). «Що зараз вибрано» показує **не** клітинка, а чип поруч: його видно
 * очима, і дотик прибирає вибір.
 *
 * Перемикач («розгорнути / згорнути все») стоїть останнім і через просвіт: він
 * не вибір, а дія — тому показує свій стан сам собою (`aria-pressed` і акцентна
 * заливка), як активна вкладка композера. Списку, який не акордеон, він не
 * потрібен — тож екран його або передає, або ні.
 *
 * @module @wwwuabot/ui/collection
 */

import { useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { MenuModal, type MenuItem } from "../menu";
import { CollectionViewSwitch } from "./CollectionViewSwitch";
import type { CollectionView } from "./types";

/** Один вибір смуги: клітинка-знак і поверхня з варіантами. */
export interface ToolbarPicker {
  /** Стабільний ключ React-списку й пікера. */
  key: string;
  /** Ім'я вибору — воно ж стоїть у шапці поверхні. */
  label: string;
  /** Знак клітинки. Різний навмисно: однаковий не сказав би, чим різняться дії. */
  icon: IconName;
  /** Поточний вибір словами: у клітинці лише знак, тож його читає `aria-label`. */
  value: string;
  /** Пункти поверхні — їх будує екран: він один знає свої варіанти. */
  items: MenuItem[];
  /** Підказка в шапці поверхні (напр. «можна вибрати кілька»). */
  hint?: string;
  /**
   * Дотик у списку закриває поверхню. Множинному вибору (хештеги) — ні: інакше
   * після кожного тега поверхню довелось би відкривати заново, а закриває її ✕.
   */
  closeOnSelect?: boolean;
}

/** Чип вибраного: один вибір, який видно очима й знімають дотиком. */
export interface ToolbarChip {
  /** Стабільний ключ React-списку. */
  key: string;
  /** Те, що видно на чипі. */
  label: string;
  /** Ім'я дії для скрінрідера: «прибрати …». */
  action: string;
  /** Що станеться, коли чип прибирають. */
  onClear: () => void;
}

interface CollectionToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Чим назвати пошук: «за текстом чи хештегом» — залежить від полів списку. */
  searchLabel: string;
  pickers: readonly ToolbarPicker[];
  view: CollectionView;
  onViewChange: (view: CollectionView) => void;
  /**
   * Перемикач «розгорнути / згорнути все» разом зі словом, що саме
   * розгортають («нотатки», «контакти»). Без нього клітинки немає.
   */
  toggleAll?: { open: boolean; onToggle: () => void; what: string };
  /**
   * Головна дія списку — «+» останнім у ряду клітинок.
   *
   * Смуга не знає, **що** створюють (повідомлення, нотатку): вона дає дії
   * місце в ряду й тло, а слово лишається в `aria-label`. Тло має **лише**
   * вона — у ряду виборів акцент означає дію, і він там рівно один.
   */
  add?: { label: string; onClick: () => void };
  /** Чипи вибраного — те, що змінили клітинки. */
  chips?: readonly ToolbarChip[];
  /** Скільки видно зараз і скільки всього: підпис з'являється, коли їх різнить. */
  filtered?: { shown: number; total: number };
}

export function CollectionToolbar({
  query,
  onQueryChange,
  searchLabel,
  pickers,
  view,
  onViewChange,
  toggleAll,
  add,
  chips,
  filtered,
}: CollectionToolbarProps): ReactElement {
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  // Розкрите поле тримає або фокус, або сам текст: згорнути запит, який уже
  // набрано, — це втратити його з очей. Тому стан тут — тільки фокус.
  const [focused, setFocused] = useState(false);
  const searchOpen = focused || query.length > 0;

  const picker = pickers.find((item) => item.key === openPicker);
  const chipList = chips ?? [];
  const narrowed = filtered !== undefined && filtered.shown !== filtered.total;

  /**
   * Пункти відкритої поверхні. Вибір закриває її сам — інакше людина мусила б
   * закривати поверхню, хоча вже побачила, що список змінився; мультивибір
   * (`closeOnSelect: false`) лишається відкритим.
   */
  function pickerItems(): MenuItem[] {
    if (!picker) return [];
    if (picker.closeOnSelect === false) return picker.items;
    return picker.items.map((item) => ({
      ...item,
      onSelect: () => {
        item.onSelect();
        setOpenPicker(null);
      },
    }));
  }

  return (
    <div className="wb-tools">
      {/* Один ряд: пошук і клітинки вибору — поруч. */}
      <div className="wb-tools-bar">
        <div className={`wb-tools-search${searchOpen ? " wb-tools-search--open" : ""}`}>
          <Icon name="search" size={16} className="wb-tools-search-icon" />
          <input
            type="search"
            className="wb-input"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Пошук"
            aria-label={searchLabel}
          />

          {/* Прибрати запит можна й чипом, але той стоїть аж у другому рядку,
              тож у полі лишається своя ✕ — там, де її шукає рука. */}
          {query.length > 0 && (
            <button
              type="button"
              className="wb-tools-search-clear"
              aria-label="Прибрати пошук"
              title="Прибрати пошук"
              onClick={() => onQueryChange("")}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div className="wb-tools-controls">
          {pickers.map((item) => (
            <button
              key={item.key}
              type="button"
              className="wb-tools-btn"
              aria-label={`${item.label}: ${item.value}`}
              title={`${item.label}: ${item.value}`}
              onClick={() => setOpenPicker(item.key)}
            >
              <Icon name={item.icon} size={16} />
            </button>
          ))}

          {/* Вигляд — теж вибір, тож стоїть із виборами, а не з перемикачем:
              він відкриває ту саму поверхню, а не діє одразу. */}
          <CollectionViewSwitch view={view} onChange={onViewChange} />

          {toggleAll && (
            <button
              type="button"
              className={`wb-tools-btn wb-tools-btn--toggle${toggleAll.open ? " wb-tools-btn--on" : ""}`}
              aria-pressed={toggleAll.open}
              aria-label={`${toggleAll.open ? "Згорнути" : "Розгорнути"} всі ${toggleAll.what}`}
              title={`${toggleAll.open ? "Згорнути" : "Розгорнути"} всі ${toggleAll.what}`}
              onClick={toggleAll.onToggle}
            >
              <Icon name={toggleAll.open ? "collapse" : "expand"} size={16} />
            </button>
          )}

          {/* Дія — останньою й **у тому ж ряду**: вона не вибір, а те, що з цього
              списку народжують, і саме тому її видно за тлом, а не за місцем. */}
          {add && (
            <button
              type="button"
              className="wb-tools-add"
              aria-label={add.label}
              title={add.label}
              onClick={add.onClick}
            >
              <Icon name="plus" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Чипи вибраного — своїм рядом під смугою: у ній місця немає (там пошук і
          клітинки), а знімати вибір треба там, де його видно. */}
      {chipList.length > 0 && (
        <div className="wb-tools-chips">
          {chipList.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="wb-chip wb-tools-chip"
              aria-label={chip.action}
              title={chip.action}
              onClick={chip.onClear}
            >
              <span className="wb-tools-chip-label">{chip.label}</span>
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      )}

      {/* Рядок підказки з'являється лише тоді, коли є що сказати: скільки
          лишилось після пошуку й фільтрів. */}
      {narrowed && (
        <div className="wb-tools-summary">
          <span className="wb-text-muted">
            Знайдено {filtered.shown} із {filtered.total}
          </span>
        </div>
      )}

      {picker && (
        <MenuModal
          title={picker.label}
          items={pickerItems()}
          // Множинний вибір без рядка-пояснення читався б як одноразовий: не
          // видно, що теги з'єднуються через «і», а не «або».
          header={picker.hint ? <p className="wb-menu-hint">{picker.hint}</p> : undefined}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  );
}
