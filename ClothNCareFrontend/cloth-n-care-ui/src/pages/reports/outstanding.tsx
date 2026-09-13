import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import ReportTable, { type Column } from "../../components/ReportTable";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { formatDate, formatMoney } from "../../utils/format";

export default function OutstandingReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  const rows = useMemo(
    () =>
      orders
        .filter((order) => order.balanceDue > 0 && order.status !== "CANCELLED")
        .sort((a, b) =>
          (a.customerName ?? "").localeCompare(b.customerName ?? ""),
        ),
    [orders],
  );

  const totalDue = useMemo(
    () => rows.reduce((sum, order) => sum + order.balanceDue, 0),
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
      key: "ordered",
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
      render: (row) => formatMoney(row.totalPrice),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      className: "cell-muted",
      render: (row) => formatMoney(row.paidAmount),
    },
    {
      key: "due",
      header: "Balance Due",
      align: "right",
      render: (row) => <strong>{formatMoney(row.balanceDue)}</strong>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
  ];

  if (loading) return <div className="empty-state">Loading outstanding...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card warning">
          <div className="stat-card-top">
            <span className="stat-card-label">Outstanding Customers</span>
          </div>
          <div className="stat-card-value">{rows.length}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Outstanding</span>
          </div>
          <div className="stat-card-value">{formatMoney(totalDue)}</div>
        </div>
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty="No outstanding balances"
      />
    </>
  );
}