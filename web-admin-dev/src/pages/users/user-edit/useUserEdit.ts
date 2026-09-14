import { useCallback, useEffect, useState } from "react";
import type { SavingActionType } from "@wwwuabot/shared";
import { readUser, updateUser, type UserRow } from "../../../shared/api/users.api";
import { buildUserPatch, parsePermissions, splitExtraFields } from "./user-edit-helpers";

export interface UserEditController {
  user: UserRow | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  savingAction: SavingActionType;
  justSaved: boolean;
  success: boolean;

  role: string;
  tariff: string;
  status: string;
  discount: number;
  permissions: string[];
  extraFields: Record<string, string>;

  setRole: (v: string) => void;
  setTariff: (v: string) => void;
  setStatus: (v: string) => void;
  setDiscount: (v: number) => void;
  setExtraField: (key: string, value: string) => void;
  togglePermission: (perm: string) => void;
  handleSave: (shouldClose?: boolean) => Promise<void>;
}

export function useUserEdit({
  userId,
  onClose,
  onSaved,
}: {
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}): UserEditController {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<SavingActionType>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [success, setSuccess] = useState(false);

  const [role, setRole] = useState("user");
  const [tariff, setTariff] = useState("free");
  const [status, setStatus] = useState("active");
  const [discount, setDiscount] = useState(0);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in readUser().then/.catch
    setLoading(true);
    readUser(userId)
      .then((data) => {
        if (cancelled || !data) return;
        setRole(String(data.role ?? "user"));
        setTariff(String(data.tariff ?? "free"));
        setStatus(String(data.status ?? "active"));
        setDiscount(Number(data.discount ?? 0));
        setPermissions(parsePermissions(data.permissions));
        setExtraFields(splitExtraFields(data));
        setUser(data);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const togglePermission = useCallback((perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }, []);

  const setExtraField = useCallback((key: string, value: string) => {
    setExtraFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(
    async (shouldClose: boolean = false) => {
      setSaving(true);
      setSavingAction(shouldClose ? "saveAndClose" : "save");
      setError(null);
      setJustSaved(false);
      try {
        await updateUser(
          userId,
          buildUserPatch({ role, tariff, status, discount, permissions, extraFields }),
        );
        onSaved();
        if (shouldClose) {
          setSuccess(true);
          setTimeout(onClose, 500);
        } else {
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2000);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
        setSavingAction(null);
      }
    },
    [userId, role, tariff, status, discount, permissions, extraFields, onClose, onSaved],
  );

  return {
    user,
    loading,
    error,
    saving,
    savingAction,
    justSaved,
    success,

    role,
    tariff,
    status,
    discount,
    permissions,
    extraFields,

    setRole,
    setTariff,
    setStatus,
    setDiscount,
    setExtraField,
    togglePermission,
    handleSave,
  };
}
