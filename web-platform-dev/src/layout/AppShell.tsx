import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ContextualSidebar } from "./ContextualSidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function AppShell() {
  return (
    <div className="layout">
      <Sidebar />
      <ContextualSidebar />
      <div className="content">
        <Header />
        <Outlet />
        <Footer />
      </div>
    </div>
  );
}
