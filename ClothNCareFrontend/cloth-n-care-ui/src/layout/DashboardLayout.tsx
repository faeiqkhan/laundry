import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { Link } from "react-router-dom";
import "../components/DashboardShell.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

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
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/customers">Customers</Link>
          <Link to="/services">Services</Link>
        </nav>
      </div>
    </div>
  );
}
