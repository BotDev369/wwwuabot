/**
 * Панель-акордеон сторінки моніторингу: шапка-кнопка і вміст під нею.
 *
 * **Чому шапка — кнопка.** Тап-таргет мусить бути ≥ 44px і не залежати від
 * `:hover` (AGENTS.md §3, мобільний): сторінку дивляться з телефона, тож
 * увесь рядок шапки — одна кнопка, а не іконка, у яку треба влучити.
 *
 * **Вміст закритої панелі не рендериться.** Згорнута панель — це обіцянка
 * «тут нічого не показано», і тримати в DOM десятки рядків таблиці під нею
 * означало б платити за розмітку, якої ніхто не бачить.
 *
 * **Керування в шапці (`tools`) видно лише в розгорнутому стані:** підпис
 * чіпа в згорнутій панелі не має сенсу, а кнопка всередині кнопки —
 * помилка розмітки.
 *
 * @module web-admin-dev/src/pages/monitoring/MonPanel
 */

import type { ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";

interface MonPanelProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Елементи керування справа в шапці (напр. вибір показника). */
  tools?: ReactNode;
  children: ReactNode;
}

export function MonPanel({ title, open, onToggle, tools, children }: MonPanelProps) {
  return (
    <div className="mon-panel">
      <div className="mon-panel-head">
        <button type="button" className="mon-panel-trigger" aria-expanded={open} onClick={onToggle}>
          <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
          <span className="mon-panel-title">{title}</span>
        </button>
        {open && tools && <div className="mon-panel-tools">{tools}</div>}
      </div>

      {open && <div className="mon-panel-body">{children}</div>}
    </div>
  );
}
