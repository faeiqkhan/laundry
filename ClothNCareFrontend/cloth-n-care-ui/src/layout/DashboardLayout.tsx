import type { ReactNode } from "react";
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
  { to: "/orders", label: "Orders", icon: "orders" },
  { to: "/customers", label: "Customers", icon: "customers" },
  { to: "/reports", label: "Reports", icon: "reports" },
] as const;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <div className="sidebar-wrap">
        <Sidebar />
      </div>

      <div className="dashboard-main">
        <Topbar />

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
