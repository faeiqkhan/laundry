import { lazy, Suspense } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import DashboardLayout from "../../layout/DashboardLayout";
import { isAdmin } from "../../utils/auth";

const ReportsOverview = lazy(() => import("./overview"));
const OutstandingReport = lazy(() => import("./outstanding"));
const InvoiceHistoryReport = lazy(() => import("./invoice-history"));
const PaymentHistoryReport = lazy(() => import("./payment-history"));
const CustomerStatementReport = lazy(() => import("./customer-statement"));
const CustomerSummaryReport = lazy(() => import("./customer-summary"));
const ProductReport = lazy(() => import("./product-report"));
const SearchInvoiceReport = lazy(() => import("./search-invoice"));
const ChalanReport = lazy(() => import("./chalan"));
const WhatsAppHistoryReport = lazy(() => import("./whatsapp-history"));
const UnpaidInvoicesReport = lazy(() => import("./unpaid-invoices"));
const OrderDetailsReport = lazy(() => import("./order-details"));

interface ReportTab {
  kind: string;
  label: string;
  adminOnly?: boolean;
}

const REPORT_TABS: ReportTab[] = [
  { kind: "overview", label: "Overview" },
  { kind: "outstanding", label: "Outstanding" },
  { kind: "invoice-history", label: "Invoice History" },
  { kind: "payment-history", label: "Payment History" },
  { kind: "customer-statement", label: "Customer Statement" },
  { kind: "customer-summary", label: "Customer Summary" },
  { kind: "product-report", label: "Product Report" },
  { kind: "search-invoice", label: "Search Invoice" },
  { kind: "chalan", label: "Chalan" },
  { kind: "whatsapp-history", label: "WhatsApp Messages" },
  { kind: "unpaid-invoices", label: "Unpaid Invoices" },
  { kind: "order-details", label: "Order Details" },
];

const TITLES: Record<string, string> = {
  overview: "Business Performance",
  outstanding: "Outstanding",
  "invoice-history": "Invoice History",
  "payment-history": "Payment History",
  "customer-statement": "Customer Statement",
  "customer-summary": "Customer Summary Report",
  "product-report": "Product Report",
  "search-invoice": "Search Invoice",
  chalan: "Chalan Report",
  "whatsapp-history": "WhatsApp Message History",
  "unpaid-invoices": "Unpaid Invoice History",
  "order-details": "Order Details Report",
};

const VALID_KINDS = new Set(REPORT_TABS.map((tab) => tab.kind));

export default function ReportsPage() {
  const { kind } = useParams();
  const admin = isAdmin();

  const activeKind = kind && VALID_KINDS.has(kind) ? kind : "overview";

  const renderView = () => {
    switch (activeKind) {
      case "outstanding":
        return <OutstandingReport />;
      case "invoice-history":
        return <InvoiceHistoryReport />;
      case "payment-history":
        return <PaymentHistoryReport />;
      case "customer-statement":
        return <CustomerStatementReport />;
      case "customer-summary":
        return <CustomerSummaryReport />;
      case "product-report":
        return <ProductReport />;
      case "search-invoice":
        return <SearchInvoiceReport />;
      case "chalan":
        return <ChalanReport />;
      case "whatsapp-history":
        return <WhatsAppHistoryReport />;
      case "unpaid-invoices":
        return <UnpaidInvoicesReport />;
      case "order-details":
        return <OrderDetailsReport />;
      case "overview":
      default:
        return <ReportsOverview />;
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{TITLES[activeKind] ?? "Reports"}</h1>
          <p>Sales, payments, and operational reports</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {REPORT_TABS.filter((tab) => !tab.adminOnly || admin).map((tab) => (
          <NavLink
            key={tab.kind}
            to={`/reports/${tab.kind}`}
            className={({ isActive }) =>
              isActive ? "tab-btn active" : "tab-btn"
            }
            role="tab"
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {!VALID_KINDS.has(activeKind) ? (
        <Navigate to="/reports/overview" replace />
      ) : (
        <Suspense fallback={<div className="empty-state">Loading report...</div>}>
          {renderView()}
        </Suspense>
      )}
    </DashboardLayout>
  );
}