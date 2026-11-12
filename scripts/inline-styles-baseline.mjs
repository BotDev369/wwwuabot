/**
 * Знімок боргу інлайнових стилів адмінки (станом на етап «нуль власних стилів»).
 *
 * Числа — не мета, а межа: гейт `scripts/check-inline-styles.mjs` падає, якщо
 * файл додав інлайн або якщо борг зменшився, а запис лишився старим.
 * Зменшувати — і є планом: кожен прибраний інлайн знижує число, нуль — ціль.
 */
export const BASELINE = {
  total: 21,
  files: {
    "web-admin-dev/src/pages/users/user-edit/PermissionFields.tsx": 8,
    "web-admin-dev/src/pages/users/UsersTable.tsx": 2,
    "web-admin-dev/src/pages/users/UserEditModal.tsx": 5,
    "web-admin-dev/src/pages/users/user-edit/ExtraFieldsCard.tsx": 3,
    "web-admin-dev/src/pages/monitoring/WorkspaceTable.tsx": 1,
    "web-admin-dev/src/pages/users/user-edit/UserInfoCard.tsx": 1,
    "web-admin-dev/src/pages/users/UserBulkBar.tsx": 1,
  },
};
