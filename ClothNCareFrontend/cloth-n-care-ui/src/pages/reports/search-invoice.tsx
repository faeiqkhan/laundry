import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import Icon from "../../components/Icons";
import ReportTable, { type Column } from "../../components/ReportTable";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { formatDate, formatMoney } from "../../utils/format";
import { downloadInvoice, ensureInvoice, printInvoice } from "../../utils/invoice";

export default function SearchInvoiceReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState("");

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

  const hasQuery = query.trim().length > 0;

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return orders.filter(
      (order) =>
        (order.invoiceNumber ?? "").toLowerCase().includes(term) ||
        (order.customerName ?? "").toLowerCase().includes(term) ||
        (order.customerPhone ?? "").toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term),
    );
  }, [orders, query]);

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
      key: "total",
      header: "Total",
      align: "right",
      render: (row) => formatMoney(row.totalPrice),
    },
    { key: "payment", header: "Payment", render: (row) => <StatusBadge status={row.paymentStatus} /> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
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

  if (loading) return <div className="empty-state">Loading invoices...</div>;

  return (
    <>
      <div className="search-box" style={{ maxWidth: 480, marginBottom: 16 }}>
        <Icon name="search" size={18} className="search-icon" />
        <input
          type="search"
          placeholder="Search by invoice number, customer, or phone..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {!hasQuery ? (
        <div className="empty-state">
          Type an invoice number, customer name, or phone to search
        </div>
      ) : (
        <ReportTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty="No invoices match your search"
        />
      )}
    </>
  );
}