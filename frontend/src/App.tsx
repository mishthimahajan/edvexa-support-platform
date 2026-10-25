
import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import Tickets from "./pages/Tickets";
import KnowledgeBase from "./pages/KnowledgeBase";

type Page = "dashboard" | "tickets" | "knowledge";

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(localStorage.getItem("edvexa_token")),
  );

  const [page, setPage] = useState<Page>("dashboard");

  function handleLogout() {
    localStorage.removeItem("edvexa_token");
    setAuthenticated(false);
    setPage("dashboard");
  }

  if (!authenticated) {
    return (
      <AuthPage
        onAuthenticated={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <div>
      <nav className="main-navigation">
        <button
          className={page === "dashboard" ? "nav-item active" : "nav-item"}
          onClick={() => setPage("dashboard")}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>

        <button
          className={page === "tickets" ? "nav-item active" : "nav-item"}
          onClick={() => setPage("tickets")}
        >
          <Ticket size={18} />
          Support Tickets
        </button>

        <button
          className={page === "knowledge" ? "nav-item active" : "nav-item"}
          onClick={() => setPage("knowledge")}
        >
          <BookOpen size={18} />
          Knowledge Base
        </button>

        <button className="nav-logout" onClick={handleLogout}>
          Sign out
        </button>
      </nav>

      {page === "dashboard" ? (
        <Dashboard onLogout={handleLogout} />
      ) : page === "tickets" ? (
        <Tickets />
      ) : (
        <KnowledgeBase />
      )}
    </div>
  );
}
