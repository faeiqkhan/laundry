import { Link } from "react-router-dom";
import "./DashboardShell.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>Cloth n Care</h1>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/orders">Orders</Link>
        <Link to="/customers">Customers</Link>
        <Link to="/services">Services</Link>
      </nav>
    </aside>
  );
}
