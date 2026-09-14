import { useState, type ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { Link } from "react-router-dom";
import Icon from "../components/Icons";
import "../components/DashboardShell.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

const mobileLinks = [
  { to: "/dashboard", label: "Home", icon: "dashboard" },
  { to: "/pos", label: "Order POS", icon: "cart" },
  { to: "/orders", label: "Orders", icon: "orders" },
  { to: "/customers", label: "Customers", icon: "customers" },
  { to: "/reports", label: "Reports", icon: "reports" },
] as const;

const COLLAPSE_KEY = "clothncare.sidebar.collapsed";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className={`dashboard-layout${collapsed ? " sidebar-collapsed" : ""}`}>
      <div className="sidebar-wrap">
        <Sidebar />
      </div>

      <div className="dashboard-main">
        <Topbar onToggleSidebar={toggleCollapsed} collapsed={collapsed} />

        <main className="dashboard-content">{children}</main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {mobileLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Icon name={link.icon} size={18} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}