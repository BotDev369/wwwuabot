import { createBrowserRouter } from "react-router-dom";
import { MyDatesPage } from "@/pages/mydate/MyDatesPage";
import { MydateResultPage } from "@/pages/mydate/MydateResultPage";
import { CompareSetupPage } from "@/pages/mydate/CompareSetupPage";
import { CompareSystemsPage } from "@/pages/mydate/CompareSystemsPage";
import { AboutPage } from "@/pages/mydate/AboutPage";
import { DynamicPage } from "@/pages/DynamicPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";

export const router = createBrowserRouter([
  // The base page is a normal platform scenario (__base__), not a hardcoded HomePage.
  { path: "/", element: <DynamicPage baseCodeword="__base__" /> },

  // Legacy prototype routes stay temporarily available while their UI is migrated to blocks.
  { path: "mydate/my-dates", element: <MyDatesPage /> },
  { path: "mydate/compare/systems", element: <CompareSystemsPage /> },
  { path: "mydate/compare", element: <CompareSetupPage /> },
  { path: "mydate/about", element: <AboutPage /> },
  { path: "profile", element: <ProfilePage /> },
  { path: "mydate/:date", element: <MydateResultPage /> },

  // Scenario-driven pages.
  { path: ":codeword", element: <DynamicPage /> },
]);
