import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import ReportTable, { type Column } from "../../components/ReportTable";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { formatDate, formatMoney } from "../../utils/format";

export default function UnpaidInvoicesReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    getOrders()
      .then((data) => {
        if (!ignore) setOrders(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const rows = useMemo(() => {
    const unpaid = orders.filter(
      (order) =>
        order.paymentStatus === "UNPAID" && order.status !== "CANCELLED",
    );
    const term = query.trim().toLowerCase();
    if (!term) return unpaid;
    return unpaid.filter(
      (order) =>
        (order.invoiceNumber ?? "").toLowerCase().includes(term) ||
        (order.customerName ?? "").toLowerCase().includes(term) ||
        (order.customerPhone ?? "").toLowerCase().includes(term),
    );
  }, [orders, query]);

  const totalUnpaid = useMemo(
    () => rows.reduce((sum, order) => sum + order.totalPrice, 0),
    [rows],
  );

  const columns: Column<Order>[] = [
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
      key: "date",
      header: "Order Date",
      className: "cell-muted",
      render: (row) => formatDate(row.createdAt?.split("T")[0] ?? ""),
    },
    {
      key: "delivery",
      header: "Delivery",
      className: "cell-muted",
      render: (row) => formatDate(row.expectedDeliveryDate),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (row) => <strong>{formatMoney(row.totalPrice)}</strong>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  if (loading) return <div className="empty-state">Loading unpaid invoices...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card warning">
          <div className="stat-card-top">
            <span className="stat-card-label">Unpaid Invoices</span>
          </div>
          <div className="stat-card-value">{rows.length}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Unpaid</span>
          </div>
          <div className="stat-card-value">{formatMoney(totalUnpaid)}</div>
        </div>
      </div>

      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search by invoice, customer, or phone..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty="No unpaid invoices"
      />
    </>
  );
}