import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import Icon from "../../components/Icons";
import ReportTable, { type Column } from "../../components/ReportTable";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { formatDate, formatMoney } from "../../utils/format";
import { downloadInvoice, ensureInvoice, printInvoice } from "../../utils/invoice";

export default function InvoiceHistoryReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setOrders(await getOrders());
  };

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
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (order) =>
        (order.invoiceNumber ?? "").toLowerCase().includes(term) ||
        (order.customerName ?? "").toLowerCase().includes(term) ||
        (order.customerPhone ?? "").toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term),
    );
  }, [orders, search]);

  const issued = orders.filter((order) => order.invoiceUrl).length;

  const handleGenerate = async (order: Order) => {
    if (working) return;
    try {
      setWorking(order.id);
      const url = await ensureInvoice(order.id);
      if (url) await fetchOrders();
    } finally {
      setWorking("");
    }
  };

  const total = rows.reduce((sum, order) => sum + order.totalPrice, 0);

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
      render: (row) => formatMoney(row.totalPrice),
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Invoice",
      render: (row) => (
        <div className="row-actions">
          {row.invoiceUrl ? (
            <>
              <button
                type="button"
                className="icon-button icon-only"
                title="Download PDF"
                onClick={() => downloadInvoice(row.invoiceUrl)}
              >
                <Icon name="download" size={16} />
              </button>
              <button
                type="button"
                className="icon-button icon-only"
                title="Print"
                onClick={() => printInvoice(row.invoiceUrl)}
              >
                <Icon name="receipt" size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-sm"
              disabled={working === row.id}
              onClick={() => handleGenerate(row)}
            >
              {working === row.id ? "..." : "Generate"}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="empty-state">Loading invoice history...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-top">
            <span className="stat-card-label">Invoices</span>
          </div>
          <div className="stat-card-value">{orders.length}</div>
          <div className="stat-card-sub">{issued} with PDF</div>
        </div>
        <div className="stat-card success">
          <div className="stat-card-top">
            <span className="stat-card-label">Listed Value</span>
          </div>
          <div className="stat-card-value">{formatMoney(total)}</div>
        </div>
      </div>

      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search by invoice, customer, or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty="No invoices found"
      />
    </>
  );
}