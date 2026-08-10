import { NavLink } from "react-router-dom";
import Icon, { type IconName } from "./Icons";
import { isAdmin } from "../utils/auth";
import "./DashboardShell.css";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const mainNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/orders", label: "Orders", icon: "orders" },
  { to: "/customers", label: "Customers", icon: "customers" },
  { to: "/services", label: "Services", icon: "services" },
];

const manageNav: NavItem[] = [
  { to: "/reports", label: "Reports", icon: "reports" },
  { to: "/analytical-dashboard", label: "Analytical Dashboard", icon: "trend-up" },
  { to: "/yearly-dashboard", label: "Yearly Dashboard", icon: "calendar" },
  { to: "/expenses", label: "Expenses", icon: "expenses" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const transactionNav: NavItem[] = [
  { to: "/pos", label: "POS Order", icon: "money" },
  { to: "/payments", label: "Payment Received", icon: "check" },
  { to: "/collection", label: "Collection", icon: "trend-up" },
  { to: "/delivery-orders", label: "Delivery Orders", icon: "clock" },
  { to: "/invoices", label: "Invoices", icon: "receipt" },
  { to: "/multi-expense", label: "Multi Expense", icon: "expenses" },
];

const masterNav: NavItem[] = [
  { to: "/products", label: "Products", icon: "box" },
  { to: "/expense-heads", label: "Expense Heads", icon: "folder" },
  { to: "/additional-charges", label: "Additional Charges", icon: "percent" },
  { to: "/storage-bags", label: "Storage Bags", icon: "bag" },
  { to: "/storage-racks", label: "Storage Racks", icon: "shelves" },
  { to: "/create-price-list", label: "Create Price List", icon: "plus" },
  { to: "/price-lists", label: "Price List", icon: "grid" },
];

const staffNav: NavItem = { to: "/staff", label: "Staff", icon: "users" };

export default function Sidebar() {
  const admin = isAdmin();

  const renderLink = ({ to, label, icon }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        isActive ? "sidebar-link active" : "sidebar-link"
      }
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Icon name="shirt" size={22} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Cloth n Care</span>
          <span className="sidebar-brand-tagline">Laundry Management</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">Overview</span>
        {mainNav.map(renderLink)}

        <span className="sidebar-section-label">Masters</span>
        {masterNav.map(renderLink)}

        <span className="sidebar-section-label">Transactions</span>
        {transactionNav.map(renderLink)}

        <span className="sidebar-section-label">Manage</span>
        {manageNav.map(renderLink)}
        {admin && renderLink(staffNav)}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-dot" />
        <span>System online</span>
      </div>
    </aside>
  );
}
