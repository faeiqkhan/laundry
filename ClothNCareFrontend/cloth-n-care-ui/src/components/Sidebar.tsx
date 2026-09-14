import { useMemo, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon, { type IconName } from "./Icons";
import { isAdmin } from "../utils/auth";
import "./DashboardShell.css";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  icon: IconName;
  items: NavItem[];
}

const dashboardLink: NavItem = { to: "/dashboard", label: "Dashboard", icon: "dashboard" };

const mastersNav: NavItem[] = [
  { to: "/customers", label: "Customer", icon: "customers" },
  { to: "/services", label: "Service", icon: "services" },
  { to: "/products", label: "Products", icon: "box" },
  { to: "/expense-heads", label: "Expense Head", icon: "folder" },
  { to: "/create-price-list", label: "Create Price List", icon: "plus" },
  { to: "/price-lists", label: "Price List", icon: "grid" },
  { to: "/settings", label: "Terms and Condition", icon: "settings" },
  { to: "/staff", label: "User Management", icon: "users", adminOnly: true },
  { to: "/storage-bags", label: "Storage Bag", icon: "bag" },
  { to: "/storage-racks", label: "Storage Rack", icon: "shelves" },
  { to: "/additional-charges", label: "Additional Charges Type", icon: "percent" },
];

const transactionsNav: NavItem[] = [
  { to: "/orders", label: "Orders", icon: "orders" },
  { to: "/delivery-orders", label: "Delivery Orders", icon: "clock" },
  { to: "/invoices", label: "Invoices", icon: "receipt" },
  { to: "/today-delivery", label: "Today's Delivery", icon: "calendar" },
];

const accountNav: NavItem[] = [
  { to: "/collection", label: "Collection", icon: "trend-up" },
  { to: "/expenses", label: "Expenses", icon: "expenses" },
  { to: "/payments", label: "Payment Received", icon: "check" },
  { to: "/multi-expense", label: "Multi Expense", icon: "money" },
];

const deleteNav: NavItem[] = [
  { to: "/delete-records?tab=order", label: "Delete Record", icon: "trash" },
  { to: "/delete-records?tab=invoice", label: "Delete Invoice", icon: "receipt" },
  { to: "/delete-records?tab=payment", label: "Delete Payment", icon: "money" },
];

const reportsNav: NavItem[] = [
  { to: "/reports/outstanding", label: "Outstanding", icon: "reports" },
  { to: "/reports/invoice-history", label: "Invoice History", icon: "receipt" },
  { to: "/reports/payment-history", label: "Payment History", icon: "money" },
  { to: "/reports/customer-statement", label: "Customer Statement", icon: "customers" },
  { to: "/reports/customer-summary", label: "Customer Summary Report", icon: "grid" },
  { to: "/reports/product-report", label: "Product Report", icon: "box" },
  { to: "/reports/search-invoice", label: "Search Invoice", icon: "search" },
  { to: "/reports/workshop-history", label: "Challan Report", icon: "tag" },
  { to: "/reports/whatsapp-history", label: "WhatsApp Message History", icon: "phone" },
  { to: "/reports/unpaid-invoices", label: "Unpaid Invoice History", icon: "trend-down" },
  { to: "/reports/order-details", label: "Order Details Report", icon: "eye" },
];

const groups: NavGroup[] = [
  { key: "masters", label: "Masters", icon: "folder", items: mastersNav },
  { key: "transactions", label: "Transactions", icon: "money", items: transactionsNav },
  { key: "accounts", label: "Accounts", icon: "trend-up", items: accountNav },
  { key: "delete", label: "Delete Records", icon: "trash", items: deleteNav },
  { key: "reports", label: "Reports", icon: "reports", items: reportsNav },
];

const settingsLink: NavItem = { to: "/settings", label: "Settings", icon: "settings" };

const GROUP_OPEN_KEY = "clothncare.sidebar.groups";

const loadOpenGroups = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(GROUP_OPEN_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    // ignore storage errors
  }
  return {};
};

function SidebarGroup({
  group,
  open,
  onToggle,
  children,
}: {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
  children: (item: NavItem) => ReactNode;
}) {
  return (
    <div className="sidebar-group">
      <button
        type="button"
        className="sidebar-group-header"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`sidebar-group-${group.key}`}
      >
        <Icon name={group.icon} size={18} />
        <span className="sidebar-group-label">{group.label}</span>
        <Icon
          name="chevron-down"
          size={16}
          className={`sidebar-group-chevron${open ? " open" : ""}`}
        />
      </button>

      {open && (
        <div id={`sidebar-group-${group.key}`} className="sidebar-group-items">
          {group.items.map(children)}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const admin = isAdmin();
  const location = useLocation();

  const isItemActive = (to: string) => {
    if (to.includes("?")) {
      return `${location.pathname}${location.search}` === to;
    }
    return location.pathname === to;
  };

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.adminOnly || admin),
        }))
        .filter((group) => group.items.length > 0),
    [admin],
  );

  const [explicit, setExplicit] = useState<Record<string, boolean>>(loadOpenGroups);

  const isGroupOpen = (group: NavGroup) => {
    if (group.key in explicit) {
      return explicit[group.key] !== false;
    }
    return group.items.some((item) => isItemActive(item.to));
  };

  const toggleGroup = (key: string) => {
    setExplicit((current) => {
      const wasOpen = key in current ? current[key] !== false : false;
      const next = { ...current, [key]: !wasOpen };
      try {
        localStorage.setItem(GROUP_OPEN_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const renderLink = ({ to, label, icon }: NavItem) => {
    const active = isItemActive(to);
    return (
      <NavLink
        key={to + label}
        to={to}
        className={`sidebar-link sidebar-sub-link${active ? " active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon name={icon} size={16} />
        <span>{label}</span>
      </NavLink>
    );
  };

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
        {renderLink(dashboardLink)}

        {visibleGroups.map((group) => (
          <SidebarGroup
            key={group.key}
            group={group}
            open={isGroupOpen(group)}
            onToggle={() => toggleGroup(group.key)}
          >
            {renderLink}
          </SidebarGroup>
        ))}

        <span className="sidebar-section-label">System</span>
        {renderLink(settingsLink)}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-dot" />
        <span>System online</span>
      </div>
    </aside>
  );
}