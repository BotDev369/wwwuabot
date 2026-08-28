import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { MyDatesPage } from "@/pages/mydate/MyDatesPage";
import { MydateResultPage } from "@/pages/mydate/MydateResultPage";
import { CompareSetupPage } from "@/pages/mydate/CompareSetupPage";
import { CompareSystemsPage } from "@/pages/mydate/CompareSystemsPage";
import { AboutPage } from "@/pages/mydate/AboutPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "mydate/my-dates", element: <MyDatesPage /> },
      { path: "mydate/compare/systems", element: <CompareSystemsPage /> },
      { path: "mydate/compare", element: <CompareSetupPage /> },
      { path: "mydate/about", element: <AboutPage /> },
      { path: "mydate/:date", element: <MydateResultPage /> },
    ],
  },
]);
