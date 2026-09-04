/**
 * RowActionMenu — контекстне меню дій для окремого рядка дати.
 */

import { Link } from 'react-router-dom';
import { icons } from '@wwwuabot/shared';
import type { MyDate } from '@/shared/api/mydate.api';
import type { ModalMode } from './mydate-types';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: string, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name as keyof typeof icons]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface RowActionMenuProps {
  date: MyDate;
  onAction: (mode: ModalMode, date: MyDate) => void;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function RowActionMenu({ date, onAction, onDelete, onClose }: RowActionMenuProps) {
  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="header-modal row-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="header-modal-header">
          <span className="header-modal-title">
            {date.name || date.date}
          </span>
          <button className="wb-close-btn" onClick={onClose}>
            {icons['close']}
          </button>
        </div>
        <div className="header-modal-body">
          <Link
            className="wb-btn wb-btn-ghost"
            to={`/mydate/${date.date}`}
            onClick={onClose}
          >
            {ico('compare')} Аналіз
          </Link>
          <button
            className="wb-btn wb-btn-ghost"
            onClick={() => onAction('view', date)}
          >
            {ico('eye')} Переглянути
          </button>
          <button
            className="wb-btn wb-btn-ghost"
            onClick={() => onAction('edit', date)}
          >
            {ico('edit')} Редагувати
          </button>
          <div className="header-modal-divider" />
          <button
            className="wb-btn wb-btn-danger"
            onClick={() => {
              onDelete(date.id);
              onClose();
            }}
          >
            {ico('trash')} Видалити
          </button>
        </div>
      </div>
    </div>
  );
}
