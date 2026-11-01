/**
 * Знімок боргу інлайнових стилів адмінки (станом на етап «нуль власних стилів»).
 *
 * Числа — не мета, а межа: гейт `scripts/check-inline-styles.mjs` падає, якщо
 * файл додав інлайн або якщо борг зменшився, а запис лишився старим.
 * Зменшувати — і є планом: кожен прибраний інлайн знижує число, нуль — ціль.
 */
export const BASELINE = {
  total: 200,
  files: {
    "web-admin-dev/src/pages/scenarios/BotRichConstructor.tsx": 17,
    "web-admin-dev/src/pages/scenarios-v2/ScenariosV2Table.tsx": 13,
    "web-admin-dev/src/pages/scenarios/ScenarioPreview.tsx": 13,
    "web-admin-dev/src/features/page-builder/BlockEditorHeader.tsx": 11,
    "web-admin-dev/src/features/page-builder/PageBuilderInline.tsx": 11,
    "web-admin-dev/src/pages/scenarios/ScenarioJsonEditor.tsx": 11,
    "web-admin-dev/src/features/page-builder/BlockEditorContent.tsx": 10,
    "web-admin-dev/src/features/page-builder/ZoneAddModal.tsx": 9,
    "web-admin-dev/src/pages/scenarios/ShareTab.tsx": 9,
    "web-admin-dev/src/features/page-builder/EmptyPageState.tsx": 8,
    "web-admin-dev/src/pages/users/user-edit/PermissionFields.tsx": 8,
    "web-admin-dev/src/pages/users/UsersTable.tsx": 8,
    "web-admin-dev/src/features/page-builder/SidebarSettings.tsx": 7,
    "web-admin-dev/src/pages/scenarios-v2/GroupSection.tsx": 7,
    "web-admin-dev/src/pages/scenarios-v2/ScenarioRow.tsx": 7,
    "web-admin-dev/src/features/page-builder/SchemaField.tsx": 6,
    "web-admin-dev/src/pages/scenarios/BotConstructor.tsx": 6,
    "web-admin-dev/src/pages/scenarios/FullscreenBuilder.tsx": 6,
    "web-admin-dev/src/pages/scenarios/SharedFieldsEditor.tsx": 5,
    "web-admin-dev/src/pages/scenarios/WebConstructor.tsx": 5,
    "web-admin-dev/src/pages/users/UserEditModal.tsx": 5,
    "web-admin-dev/src/pages/home/HomePage.tsx": 4,
    "web-admin-dev/src/pages/scenarios/ScenarioCardBody.tsx": 3,
    "web-admin-dev/src/pages/users/user-edit/ExtraFieldsCard.tsx": 3,
    "web-admin-dev/src/pages/scenarios/ScenarioCardHeader.tsx": 2,
    "web-admin-dev/src/features/page-builder/BlockEditor.tsx": 1,
    "web-admin-dev/src/features/page-builder/PageBuilderPage.tsx": 1,
    "web-admin-dev/src/pages/messages/RequestList.tsx": 1,
    "web-admin-dev/src/pages/monitoring/WorkspaceTable.tsx": 1,
    "web-admin-dev/src/pages/users/user-edit/UserInfoCard.tsx": 1,
    "web-admin-dev/src/pages/users/UserBulkBar.tsx": 1,
  },
};
