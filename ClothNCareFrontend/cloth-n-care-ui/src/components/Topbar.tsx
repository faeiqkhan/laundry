import "./DashboardShell.css";
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

export default function Topbar() {
  const token = localStorage.getItem("token");
  const user = token ? decodeTokenClaims(token) : null;
  const displayName = user?.name ?? user?.sub ?? "Current user";
  const lanUrl = getLanUrl();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <header className="topbar">
      <h2>Dashboard</h2>

      <div className="topbar-account">
        <div className="network-summary" title={lanUrl}>
          <span className="network-summary-label">Network URL</span>
          <span className="network-summary-url">{lanUrl}</span>
        </div>

        <div className="user-summary" title={user?.sub}>
          <span className="user-summary-label">Signed in as</span>
          <span className="user-summary-name">{displayName}</span>
          {user?.role ? <span className="user-summary-role">{user.role}</span> : null}
        </div>

        <button type="button" onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </header>
  );
}
