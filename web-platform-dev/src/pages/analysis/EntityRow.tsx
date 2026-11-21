/**
 * Один рядок списку людей, подій або груп: чекбокс, назва з метаданими й
 * компактні дії праворуч. Дії не переносяться під рядок — це той самий
 * патерн, що в Material-списках: провідна ознака вибору, основна назва,
 * trailing-дії.
 *
 * @module web-platform-dev/src/pages/analysis/EntityRow
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@wwwuabot/shared";

interface EntityRowProps {
  name: string;
  meta: string;
  picked: boolean;
  checkLabel: string;
  onToggle: () => void;
  actions: ReactNode;
  children?: ReactNode;
}

export function EntityRow({
  name,
  meta,
  picked,
  checkLabel,
  onToggle,
  actions,
  children,
}: EntityRowProps): ReactNode {
  return (
    <div className="an-person-line" data-picked={picked}>
      <label className="an-person an-person--pick">
        <input type="checkbox" checked={picked} aria-label={checkLabel} onChange={onToggle} />
        <span className="an-person__text">
          <span className="an-person__name" title={name}>
            {name}
          </span>
          <span className="an-person__date">{meta}</span>
        </span>
      </label>
      <div className="an-row-actions">{actions}</div>
      {children && <div className="an-person-line__edit">{children}</div>}
    </div>
  );
}

interface RowActionProps {
  label: string;
  icon: IconName;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}

/** Дія рядка: іконка з підписом для читача екрана й підказкою для мишки. */
export function RowAction({ label, icon, onClick, href, danger }: RowActionProps): ReactNode {
  const className = `an-row-action${danger ? " an-row-action--danger" : ""}`;
  const content = <Icon name={icon} size={18} />;

  if (href) {
    return (
      <Link className={className} to={href} aria-label={label} title={label}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={onClick}>
      {content}
    </button>
  );
}
