import { Icon } from "@wwwuabot/shared";
import {
  MAIN_TABS,
  MAIN_TAB_ICONS,
  SUB_TABS,
  SUB_TAB_ICONS,
  type MainTab,
  type SubTab,
} from "./scenario-modal-types";

/** Головні вкладки модалки — іконки, без підписів (підпис — у `title`). */
export function MainTabs({
  active,
  onSelect,
}: {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
}) {
  return (
    <div className="scn-tabs">
      {MAIN_TABS.map((tab) => (
        <button
          key={tab.key}
          className={`scn-tab${active === tab.key ? " scn-tab--active" : ""}`}
          onClick={() => onSelect(tab.key)}
          title={tab.label}
        >
          <Icon name={MAIN_TAB_ICONS[tab.key]} size={20} />
        </button>
      ))}
    </div>
  );
}

/**
 * Підвкладки: прев'ю / JSON / конструктор. У «Поділитись» їх немає — там
 * нічого ні прев'юїти, ні редагувати.
 */
export function SubTabs({
  active,
  onSelect,
  onOpenJson,
}: {
  active: SubTab;
  onSelect: (tab: SubTab) => void;
  onOpenJson: () => void;
}) {
  return (
    <div className="scn-subtabs">
      {SUB_TABS.map((st) => (
        <button
          key={st.key}
          className={`scn-subtab${active === st.key ? " scn-subtab--active" : ""}`}
          onClick={() => (st.key === "json" ? onOpenJson() : onSelect(st.key))}
          title={st.label}
        >
          <Icon name={SUB_TAB_ICONS[st.key]} size={18} />
        </button>
      ))}
    </div>
  );
}
