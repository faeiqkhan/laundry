import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../api/orders";
import { deleteInvoice } from "../api/invoices";
import DashboardLayout from "../layout/DashboardLayout";
import ImportExportButtons from "../components/ImportExportButtons";
import Icon from "../components/Icons";
import StatusBadge from "../components/StatusBadge";
import type { Order } from "../types/order";
import { formatMoney, formatDate } from "../utils/format";
import { downloadInvoice, printInvoice } from "../utils/invoice";
import { canManage } from "../utils/auth";

export default function InvoicesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (order) =>
        (order.invoiceNumber ?? "").toLowerCase().includes(term) ||
        (order.customerName ?? "").toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term),
    );
  }, [orders, search]);

  const issued = orders.filter((order) => order.invoiceUrl).length;

  const refreshOrders = async () => {
    try {
      setOrders(await getOrders());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInvoice = async (order: Order) => {
    if (!window.confirm(`Delete invoice ${order.invoiceNumber ?? order.id.slice(0, 8)}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteInvoice(order.id);
      await refreshOrders();
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete invoice");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading invoices...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Invoices</h1>
          <p>
            {orders.length} orders · {issued} with invoices
          </p>
        </div>
        <div className="page-header-actions">
          <ImportExportButtons resource="invoices" importable={false} />
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search by invoice, customer, or order id"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Order Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    <Icon name="receipt" size={32} className="table-empty-icon" />
                    <div>No invoices found</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700 }}>
                    {order.invoiceNumber ?? order.id.slice(0, 8)}
                  </td>
                  <td>
                    {order.customerName ?? "-"}
                    {order.customerPhone && (
                      <div className="muted">{order.customerPhone}</div>
                    )}
                  </td>
                  <td className="cell-muted">
                    {formatDate(order.createdAt?.split("T")[0] ?? "")}
                  </td>
                  <td className="cell-total">{formatMoney(order.totalPrice)}</td>
                  <td>
                    <StatusBadge status={order.paymentStatus} />
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="Download PDF"
                        disabled={!order.invoiceUrl}
                        onClick={() => downloadInvoice(order.invoiceUrl)}
                      >
                        <Icon name="download" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="Print"
                        disabled={!order.invoiceUrl}
                        onClick={() => printInvoice(order.invoiceUrl)}
                      >
                        <Icon name="receipt" size={16} />
                      </button>
                      {canManage() && order.invoiceUrl && (
                        <button
                          type="button"
                          className="icon-button icon-only danger"
                          title="Delete invoice"
                          onClick={() => handleDeleteInvoice(order)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
