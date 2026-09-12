/**
 * PermissionGate — декларативний контроль прав та ролей доступу до блоків та компонентів.
 *
 * Забезпечує Zero Bundle / Render Leakage: якщо користувач не має прав,
 * дочірні елементи навіть не монтуються у DOM.
 *
 * @module @wwwuabot/ui/PermissionGate
 */

import type { ReactNode } from "react";
import type { UserProfile } from "@wwwuabot/shared/types/page-config";

export interface PermissionGateProps {
  /** Профіль користувача. */
  user?: UserProfile | null;
  /** Чи показувати тільки адміністраторам. */
  adminOnly?: boolean;
  /** Чи показувати тільки власнику сторінки/ресурсу. */
  ownerOnly?: boolean;
  /** Прапорець чи є поточний користувач власником. */
  isOwner?: boolean;
  /** Список дозволених ролей (OR логіка). */
  requiredRole?: string[];
  /** Обов'язковий дозвіл/здатність (з user.permissions). */
  requiredCapability?: string;
  /** Список обов'язкових дозволів (AND логіка). */
  requiredPermissions?: string[];
  /** Fallback компонент, якщо доступ заборонено. */
  fallback?: ReactNode;
  /** Контент для рендеру при успішній перевірці. */
  children: ReactNode;
}

/**
 * Декларативний захисний компонент.
 */
export function PermissionGate({
  user,
  adminOnly,
  ownerOnly,
  isOwner = false,
  requiredRole,
  requiredCapability,
  requiredPermissions,
  fallback = null,
  children,
}: PermissionGateProps) {
  // 1. Перевірка adminOnly
  if (adminOnly) {
    const role = (user?.role ?? "").toLowerCase();
    const isAdmin = role === "admin" || role === "superadmin";
    if (!isAdmin) return <>{fallback}</>;
  }

  // 2. Перевірка ownerOnly
  if (ownerOnly && !isOwner) {
    return <>{fallback}</>;
  }

  // 3. Перевірка ролей
  if (requiredRole && requiredRole.length > 0) {
    const userRole = (user?.role ?? "").toLowerCase();
    const allowed = requiredRole.some((r) => r.toLowerCase() === userRole);
    if (!allowed) return <>{fallback}</>;
  }

  // 4. Перевірка конкретної можливості (capability)
  if (requiredCapability) {
    const permissions = user?.permissions ?? [];
    if (!permissions.includes(requiredCapability)) {
      return <>{fallback}</>;
    }
  }

  // 5. Перевірка списку permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissions = user?.permissions ?? [];
    const hasAll = requiredPermissions.every((p) => permissions.includes(p));
    if (!hasAll) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
