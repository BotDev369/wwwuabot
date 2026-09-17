/**
 * Смуга керування списком нотаток: пошук, три вибори (сортування, групування,
 * фільтр за хештегами) і знімні чипи вибраного.
 *
 * Порядок у ряду — пошук ліворуч, клітинки поруч праворуч. Поле пошуку в
 * спокої завширшки з власний підпис («Пошук») і **розкривається** на фокус або
 * запит: порожнє поле на всю ширину забирало місце саме в тих трьох клітинок,
 * за якими людина приходить (правило 18).
 *
 * Ряд **не переноситься**: розкрите поле забирає лише вільний простір, а три
 * клітинки лишаються на своєму місці — інакше на фокусі вони стрибали на
 * другий рядок, і смуга «переїжджала» саме тоді, коли людина зібралась
 * друкувати. Чипи вибраного — окремий ряд **під** смугою: вони не клітинки
 * керування, а те, що ці клітинки змінили.
 *
 * Поле пошуку — **один** контрол, і контрол тут саме поле: у спокої навколо
 * нього немає ні заливки, ні рамки (поруч стоять три клітинки, і залите поле
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
 * позначений галочкою — бо це стан, а не перехід.
 *
 * Четверта клітинка — **вибір вигляду** (`CollectionViewSwitch` зі спільного
 * `@wwwuabot/ui/collection`): рядки чи картки-превью й скільки колонок. Вона
 * стоїть серед виборів, бо вибір і є, — але вона не «клітинка нотаток»: той
 * самий вибір знадобиться товарам, новинам і постам, тож знак, пікер і
 * клас розкладки — спільні.
 *
 * П'ята клітинка — **перемикач** «розгорнути / згорнути всі нотатки»: перші
 * чотири лише обирають, а цей діє одразу (і тому показує стан сам собою —
 * `aria-pressed` і акцентна заливка), бо список нотаток довгий і читати його
 * доводиться по одній картці.
 *
 * Самі клітинки — без підпису й без заливки: та сама клітинка, що у вкладок
 * композера (одне правило на всіх), тому ряд читається як звична панель дій, а
 * не як три «овали». «Що зараз вибрано» показує **не** клітинка, а чип поруч:
 * його видно очима, і дотик прибирає вибір (правила вибору — `viewChips` у
 * `view.ts`, чисті й перевірені тестом).
 *
 * Хештегів можна вибрати кілька: у пікері дотик перемикає один тег і не
 * закриває список (`toggleTagFilter`), а в смузі кожен вибраний тег стоїть
 * своїм чипом, щоб зняти один, не втративши решти.
 *
 * @module @wwwuabot/ui/notes
 */

import { useState, type ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { CollectionViewSwitch } from "../collection";
import { MenuModal, type MenuItem } from "../menu";
import type { NotesGroupBy, NotesSort, NotesView } from "./types";
import {
  GROUP_OPTIONS,
  SORT_OPTIONS,
  UNTAGGED_LABEL,
  selectedTags,
  tagFilterLabel,
  toggleTagFilter,
  viewChips,
} from "./view";

type Picker = "sort" | "group" | "tags";

interface NotesToolbarProps {
  view: NotesView;
  onChange: (patch: Partial<NotesView>) => void;
  /** Усі хештеги списку — з них будується фільтр. */
  tags: readonly string[];
  /** Скільки нотаток видно зараз і скільки всього. */
  shown: number;
  total: number;
  /** Видно зараз **усі** видимі нотатки розгорнутими. */
  allOpen: boolean;
  /** Розгорнути всі нотатки або згорнути всі — перемикач, а не вибір. */
  onToggleAll: () => void;
}

/**
 * Три вибори — дані, а не розмітка: четвертий буде рядком у цьому списку.
 *
 * Знаки різні навмисно, бо різні й дії: стрілки в різні боки — порядок,
 * стос шарів — групування, решітка — хештег. Один і той самий знак на всі три
 * (як було з `list`/`blocks`/`hash`) не каже нічого.
 */
const PICKERS: readonly { key: Picker; label: string; icon: IconName }[] = [
  { key: "sort", label: "Сортування", icon: "sort" },
  { key: "group", label: "Групування", icon: "layers" },
  { key: "tags", label: "Хештеги", icon: "hash" },
];

export function NotesToolbar({
  view,
  onChange,
  tags,
  shown,
  total,
  allOpen,
  onToggleAll,
}: NotesToolbarProps): ReactElement {
  const [picker, setPicker] = useState<Picker | null>(null);
  // Розкрите поле тримає або фокус, або сам текст: згорнути запит, який уже
  // набрано, — це втратити його з очей. Тому стан тут — тільки фокус.
  const [focused, setFocused] = useState(false);
  const searchOpen = focused || view.query.length > 0;

  const sortOption = SORT_OPTIONS.find((option) => option.value === view.sort) ?? SORT_OPTIONS[0];
  const groupOption =
    GROUP_OPTIONS.find((option) => option.value === view.groupBy) ?? GROUP_OPTIONS[0];
  const chosenTags = selectedTags(view.tags);

  /** Що зараз вибрано — словами: у клітинці лише знак, тож ім'я й стан читає
      `aria-label`, а не око. Вибране видно поруч, чипом. */
  const chosen: Record<Picker, string> = {
    sort: sortOption.label,
    group: groupOption.label,
    tags: tagFilterLabel(view.tags),
  };

  /** Пункти пікера: вибраний позначений галочкою (`selected`). */
  function pickerItems(): MenuItem[] {
    if (picker === "sort") {
      return SORT_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "sort" as const,
        selected: view.sort === option.value,
        onSelect: () => changeSort(option.value),
      }));
    }
    if (picker === "group") {
      return GROUP_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        icon: "layers" as const,
        selected: view.groupBy === option.value,
        onSelect: () => changeGroup(option.value),
      }));
    }
    const items: MenuItem[] = [
      {
        key: "all",
        label: "Усі нотатки",
        icon: "list",
        selected: view.tags.kind === "all",
        onSelect: () => {
          onChange({ tags: { kind: "all" } });
          setPicker(null);
        },
      },
      {
        key: "untagged",
        label: UNTAGGED_LABEL,
        icon: "minus",
        selected: view.tags.kind === "untagged",
        onSelect: () => {
          onChange({ tags: { kind: "untagged" } });
          setPicker(null);
        },
      },
    ];
    // Теги — множинний вибір, тож дотик у списку його **не** закриває: інакше
    // після кожного тега поверхню довелось би відкривати заново. Закриває її
    // ✕ у шапці (або Escape) — коли вибір скінчено.
    for (const tag of tags) {
      items.push({
        key: `tag:${tag}`,
        label: `#${tag}`,
        icon: "hash",
        selected: chosenTags.includes(tag),
        onSelect: () => onChange({ tags: toggleTagFilter(view.tags, tag) }),
      });
    }
    return items;
  }

  // Кожен вибір закриває пікер: інакше людина мусила б закривати його сама,
  // хоча вже побачила, що список змінився.
  const changeSort = (sort: NotesSort) => {
    onChange({ sort });
    setPicker(null);
  };
  const changeGroup = (groupBy: NotesGroupBy) => {
    onChange({ groupBy });
    setPicker(null);
  };

  const chips = viewChips(view);

  return (
    <div className="wb-note-tools">
      {/* Один ряд: пошук і три клітинки вибору — поруч. */}
      <div className="wb-note-bar">
        <div className={`wb-note-search${searchOpen ? " wb-note-search--open" : ""}`}>
          <Icon name="search" size={16} className="wb-note-search-icon" />
          <input
            type="search"
            className="wb-input"
            value={view.query}
            onChange={(event) => onChange({ query: event.target.value })}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Пошук"
            aria-label="Пошук за текстом або хештегом"
          />

          {/* Прибрати запит можна й чипом, але той стоїть аж у другому рядку,
              тож у полі лишається своя ✕ — там, де її шукає рука. */}
          {view.query.length > 0 && (
            <button
              type="button"
              className="wb-note-search-clear"
              aria-label="Прибрати пошук"
              title="Прибрати пошук"
              onClick={() => onChange({ query: "" })}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div className="wb-note-controls">
          {PICKERS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              className="wb-note-tool"
              aria-label={`${label}: ${chosen[key]}`}
              title={`${label}: ${chosen[key]}`}
              onClick={() => setPicker(key)}
            >
              <Icon name={icon} size={16} />
            </button>
          ))}

          {/* Вигляд — теж вибір, тож стоїть із виборами, а не з перемикачем:
              він відкриває ту саму поверхню, а не діє одразу. */}
          <CollectionViewSwitch
            view={{ layout: view.layout, columns: view.columns }}
            onChange={(next) => onChange(next)}
          />

          {/* Перемикач, а не вибір: пікери відкривають поверхню, а цей діє
              одразу — і тому показує стан не позначкою в списку, а сам собою
              (`aria-pressed` + акцентна заливка, як у вкладки композера). */}
          <button
            type="button"
            className={`wb-note-tool wb-note-tool--toggle${allOpen ? " wb-note-tool--on" : ""}`}
            aria-pressed={allOpen}
            aria-label={allOpen ? "Згорнути всі нотатки" : "Розгорнути всі нотатки"}
            title={allOpen ? "Згорнути всі нотатки" : "Розгорнути всі нотатки"}
            onClick={onToggleAll}
          >
            <Icon name={allOpen ? "collapse" : "expand"} size={16} />
          </button>
        </div>
      </div>

      {/* Чипи вибраного — своїм рядом під смугою: у ній місця немає (там
          пошук і три клітинки), а знімати вибір треба там, де його видно. */}
      {chips.length > 0 && (
        <div className="wb-note-chips">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="wb-chip wb-note-chip"
              aria-label={chip.action}
              title={chip.action}
              onClick={() => onChange(chip.reset)}
            >
              <span className="wb-note-chip-label">{chip.label}</span>
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      )}

      {/* Рядок підказки з'являється лише тоді, коли є що сказати: скільки
          лишилось після пошуку й фільтрів. */}
      {shown !== total && (
        <div className="wb-note-summary">
          <span className="wb-text-muted">
            Знайдено {shown} із {total}
          </span>
        </div>
      )}

      {picker && (
        <MenuModal
          title={PICKERS.find((item) => item.key === picker)?.label ?? ""}
          items={pickerItems()}
          // Множинний вибір без рядка-пояснення читався б як одноразовий: не
          // видно, що теги з'єднуються через «і», а не «або».
          header={
            picker === "tags" ? (
              <p className="wb-menu-hint">Можна вибрати кілька — нотатка мусить мати всі</p>
            ) : undefined
          }
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
