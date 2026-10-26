/**
 * UserEditModal — редагування типізованих полів рядка `users` плюс «додаткові
 * поля» (те, що бот дописує сам). Розмітка-каркас: стан — `useUserEdit`,
 * карти — `user-edit/*`.
 */

import { Icon, SaveActionButtons } from "@wwwuabot/shared";
import { ExtraFieldsCard } from "./user-edit/ExtraFieldsCard";
import { PermissionFields } from "./user-edit/PermissionFields";
import { UserInfoCard } from "./user-edit/UserInfoCard";
import { useUserEdit } from "./user-edit/useUserEdit";

interface Props {
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function UserEditModal({ userId, onClose, onSaved }: Props) {
  const edit = useUserEdit({ userId, onClose, onSaved });

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <span className="wb-modal-title">
            <Icon name="edit" /> {edit.loading ? "Завантаження…" : `Редагувати #${userId}`}
            {edit.user?.username ? `  @${edit.user.username}` : ""}
          </span>
          <button className="wb-close-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="wb-modal-body" style={{ overflow: "auto", flex: 1 }}>
          {edit.loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              Завантаження…
            </div>
          ) : edit.error && !edit.user ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--color-error, #ef4444)" }}>
              Помилка: {edit.error}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 4px" }}>
              <PermissionFields
                role={edit.role}
                tariff={edit.tariff}
                status={edit.status}
                discount={edit.discount}
                permissions={edit.permissions}
                onRole={edit.setRole}
                onTariff={edit.setTariff}
                onStatus={edit.setStatus}
                onDiscount={edit.setDiscount}
                onTogglePermission={edit.togglePermission}
              />

              <UserInfoCard user={edit.user} />

              <ExtraFieldsCard fields={edit.extraFields} onChange={edit.setExtraField} />
            </div>
          )}

          {edit.error && (
            <div
              style={{ padding: "8px 12px", color: "var(--color-error, #ef4444)", fontSize: 13 }}
            >
              {edit.error}
            </div>
          )}
        </div>

        <div className="wb-modal-footer">
          <SaveActionButtons
            onSaveAndClose={() => edit.handleSave(true)}
            onSave={() => edit.handleSave(false)}
            onClose={onClose}
            saving={edit.saving}
            savingAction={edit.savingAction}
            loading={edit.loading}
            saved={edit.justSaved}
            success={edit.success}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
