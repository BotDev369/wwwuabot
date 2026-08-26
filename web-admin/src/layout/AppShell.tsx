import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar/Sidebar";

export function AppShell() {
  return (
    <div className="app-root">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
