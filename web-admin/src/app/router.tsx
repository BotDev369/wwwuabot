import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { EditorPage } from "../pages/editor/EditorPage";
import { ScenariosPage } from "../pages/scenarios/ScenariosPage";
import { ScenarioPreviewPage } from "../pages/scenarios/ScenarioPreviewPage";
import { ScenarioFormPage } from "../pages/scenarios/ScenarioFormPage";
import { UsersPage } from "../pages/users/UsersPage";
import { ScenariosV2Page } from "../pages/scenarios-v2/ScenariosV2Page";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "editor", element: <EditorPage /> },
      { path: "scenarios", element: <ScenariosPage /> },
      { path: "scenarios/new", element: <ScenarioFormPage /> },
      { path: "scenarios/:codeword", element: <ScenarioPreviewPage /> },
      { path: "scenarios/:codeword/edit", element: <ScenarioFormPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "scenarios-v2", element: <ScenariosV2Page /> },
    ],
  },
]);
