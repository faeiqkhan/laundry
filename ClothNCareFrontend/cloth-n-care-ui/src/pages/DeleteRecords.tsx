import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteOrder, getOrders } from "../api/orders";
import { deleteInvoice } from "../api/invoices";
import { deletePayment, getPayments, type PaymentRecord } from "../api/payments";
import type { Order } from "../types/order";
import DashboardLayout from "../layout/DashboardLayout";
import ReportTable, { type Column } from "../components/ReportTable";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatMoney } from "../utils/format";

type Tab = "order" | "invoice" | "payment";

const TABS: { key: Tab; label: string }[] = [
  { key: "order", label: "Delete Record" },
  { key: "invoice", label: "Delete Invoice" },
  { key: "payment", label: "Delete Payment" },
];

export default function DeleteRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab | null) ?? "order";
  const [query, setQuery] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  const loadOrders = async () => {
    setOrders(await getOrders());
  };

  useEffect(() => {
    let ignore = false;

    Promise.all([getOrders(), getPayments()])
      .then(([orderData, paymentData]) => {
        if (!ignore) {
          setOrders(orderData);
          setPayments(paymentData);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (order) =>
        (order.invoiceNumber ?? "").toLowerCase().includes(q) ||
        (order.customerName ?? "").toLowerCase().includes(q) ||
        (order.customerPhone ?? "").toLowerCase().includes(q),
    );
  }, [orders, query]);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (payment) =>
        (payment.invoiceNumber ?? "").toLowerCase().includes(q) ||
        (payment.customerName ?? "").toLowerCase().includes(q),
    );
  }, [payments, query]);

  const handleDeleteOrder = async (order: Order) => {
    const label = order.invoiceNumber ?? order.id.slice(0, 8);
    if (!window.confirm(`Delete order ${label} permanently?`)) return;
    try {
      setWorking(order.id);
      await deleteOrder(order.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to delete order");
    } finally {
      setWorking("");
    }
  };

  const handleDeleteInvoice = async (order: Order) => {
    const label = order.invoiceNumber ?? order.id.slice(0, 8);
    if (!window.confirm(`Delete the invoice for ${label}?`)) return;
    try {
      setWorking(order.id);
      await deleteInvoice(order.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to delete invoice");
    } finally {
      setWorking("");
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (!window.confirm(`Delete payment of ${formatMoney(payment.amount)}?`)) return;
    try {
      setWorking(payment.id);
      await deletePayment(payment.id);
      setPayments(await getPayments());
    } catch (err) {
      console.error(err);
      alert("Failed to delete payment");
    } finally {
      setWorking("");
    }
  };

  const orderColumns = (onDelete: (order: Order) => void): Column<Order>[] => [
    {
      key: "invoice",
      header: "Invoice",
      render: (row) => (
        <span style={{ fontWeight: 700 }}>
          {row.invoiceNumber ?? row.id.slice(0, 8)}
        </span>
      ),
    },
    { key: "customer", header: "Customer", render: (row) => row.customerName ?? "-" },
    { key: "phone", header: "Phone", render: (row) => row.customerPhone ?? "-" },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (row) => formatMoney(row.totalPrice),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={working === row.id}
          onClick={() => onDelete(row)}
        >
          {working === row.id ? "..." : "Delete"}
        </button>
      ),
    },
  ];

  const paymentColumns = (
    onDelete: (payment: PaymentRecord) => void,
  ): Column<PaymentRecord>[] => [
    {
      key: "invoice",
      header: "Invoice",
      render: (row) => (
        <span style={{ fontWeight: 700 }}>
          {row.invoiceNumber ?? row.orderId?.slice(0, 8) ?? "-"}
        </span>
      ),
    },
    { key: "customer", header: "Customer", render: (row) => row.customerName ?? "-" },
    { key: "method", header: "Method", render: (row) => row.method },
    { key: "date", header: "Paid At", render: (row) => formatDateTime(row.paidAt) },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => formatMoney(row.amount),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={working === row.id}
          onClick={() => onDelete(row)}
        >
          {working === row.id ? "..." : "Delete"}
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Delete Records</h1>
          <p>Permanent delete actions</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`tab-btn${tab === entry.key ? " active" : ""}`}
            onClick={() => setSearchParams({ tab: entry.key })}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search invoice, customer, or phone..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">Loading records...</div>
      ) : tab === "payment" ? (
        <ReportTable
          columns={paymentColumns(handleDeletePayment)}
          rows={filteredPayments}
          rowKey={(row) => row.id}
          empty="No payments found"
        />
      ) : (
        <ReportTable
          columns={orderColumns(tab === "invoice" ? handleDeleteInvoice : handleDeleteOrder)}
          rows={filteredOrders}
          rowKey={(row) => row.id}
          empty="No orders found"
        />
      )}
    </DashboardLayout>
  );
}