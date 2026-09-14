import { useLocation } from "react-router-dom";
import "./DashboardShell.css";
import Icon from "./Icons";
import { getLanUrl } from "../utils/network";

interface TokenClaims {
  sub?: string;
  name?: string;
  role?: string;
}

const decodeTokenClaims = (token: string): TokenClaims | null => {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );

    return JSON.parse(json) as TokenClaims;
  } catch {
    return null;
  }
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/customers": "Customers",
  "/services": "Services",
  "/reports": "Reports",
  "/expenses": "Expenses",
  "/settings": "Settings",
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export default function Topbar({
  onToggleSidebar,
  collapsed,
}: {
  onToggleSidebar?: () => void;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = token ? decodeTokenClaims(token) : null;
  const displayName = user?.name ?? user?.sub ?? "Current user";
  const initials = getInitials(displayName);
  const role = user?.role ?? "STAFF";
  const lanUrl = getLanUrl();

  const title = pageTitles[location.pathname] ?? "Cloth & Care";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        {onToggleSidebar && (
          <button
            type="button"
            className="icon-button sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <Icon name="menu" size={20} />
          </button>
        )}
        <h2>{title}</h2>
      </div>

      <div className="topbar-actions">
        <a className="topbar-network" href={lanUrl} title={lanUrl}>
          <span className="topbar-network-dot" />
          <span className="topbar-network-label">LAN Access</span>
        </a>

        <div className="topbar-user">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="topbar-user-text">
            <span className="topbar-user-name">{displayName}</span>
            <span className="topbar-user-role">{role}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="icon-button logout-button"
          title="Logout"
        >
          <Icon name="logout" size={18} />
          <span className="logout-button-label">Logout</span>
        </button>
      </div>
    </header>
  );
}
