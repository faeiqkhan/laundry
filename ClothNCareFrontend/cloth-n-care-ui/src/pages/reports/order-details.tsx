import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import Icon from "../../components/Icons";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { PAYMENT_METHOD_LABELS } from "../../types/order";
import { formatDate, formatDateTime, formatMoney } from "../../utils/format";
import { downloadInvoice, printInvoice } from "../../utils/invoice";

export default function OrderDetailsReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

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

  const matches = useMemo(() => {
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

  const pickOrder = (order: Order) => {
    setSelected(order);
    setQuery(order.invoiceNumber ?? order.id.slice(0, 8));
  };

  if (loading) return <div className="empty-state">Loading orders...</div>;

  return (
    <>
      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search by invoice, customer, or phone..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
        />
      </div>

      {!selected && matches.length > 0 && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => pickOrder(order)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontWeight: 700 }}>
                    {order.invoiceNumber ?? order.id.slice(0, 8)}
                  </td>
                  <td>{order.customerName ?? "-"}</td>
                  <td className="cell-muted">{order.customerPhone ?? "-"}</td>
                  <td className="cell-total">{formatMoney(order.totalPrice)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selected && matches.length === 0 && (
        <div className="empty-state">Search and select an order to view its details</div>
      )}

      {selected && <OrderDetails order={selected} />}
    </>
  );
}

function OrderDetails({ order }: { order: Order }) {
  return (
    <>
      <div className="table-card">
        <div className="card-title-row">
          <h3>
            Order {order.invoiceNumber ?? order.id.slice(0, 8)}
            <span className="cell-muted" style={{ marginLeft: 8, fontSize: 13 }}>
              {order.id}
            </span>
          </h3>
          <div className="row-actions">
            <button
              type="button"
              className="icon-button"
              disabled={!order.invoiceUrl}
              onClick={() => printInvoice(order.invoiceUrl)}
            >
              <Icon name="receipt" size={16} />
              Print Invoice
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!order.invoiceUrl}
              onClick={() => downloadInvoice(order.invoiceUrl)}
            >
              <Icon name="download" size={16} />
              Download Invoice
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-item-label">Status</span>
            <span className="detail-item-value">
              <StatusBadge status={order.status} />
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-item-label">Payment</span>
            <span className="detail-item-value">
              <StatusBadge status={order.paymentStatus} />
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-item-label">Customer</span>
            <span className="detail-item-value">{order.customerName ?? "-"}</span>
            {order.customerPhone && <div className="muted">{order.customerPhone}</div>}
          </div>
          <div className="detail-item">
            <span className="detail-item-label">Created By</span>
            <span className="detail-item-value">{order.createdByName ?? "-"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-item-label">Order Date</span>
            <span className="detail-item-value">
              {formatDateTime(order.createdAt)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-item-label">Expected Delivery</span>
            <span className="detail-item-value">
              {formatDate(order.expectedDeliveryDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-title-row">
          <h3>Items ({order.items?.length ?? 0})</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.serviceType}</td>
                  <td className="cell-muted">{item.productType}</td>
                  <td>{item.quantity}</td>
                  <td className="cell-total">{formatMoney(item.unitPrice)}</td>
                  <td className="cell-total">{formatMoney(item.lineTotal)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="table-empty">No items recorded</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="card-title-row">
          <h3>Amounts</h3>
        </div>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Total</td>
              <td className="cell-total">{formatMoney(order.totalPrice)}</td>
            </tr>
            <tr>
              <td>Discount</td>
              <td className="cell-total">
                {order.discount > 0 ? `-${formatMoney(order.discount)}` : formatMoney(0)}
              </td>
            </tr>
            <tr>
              <td>Tax</td>
              <td className="cell-total">{formatMoney(order.taxAmount)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Paid</td>
              <td className="cell-total" style={{ fontWeight: 700, color: "#059669" }}>
                {formatMoney(order.paidAmount)}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Balance Due</td>
              <td className="cell-total" style={{ fontWeight: 700, color: "#dc2626" }}>
                {formatMoney(order.balanceDue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Payments Received</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="cell-muted">{formatDateTime(payment.paidAt)}</td>
                  <td className="cell-total">{formatMoney(payment.amount)}</td>
                  <td>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</td>
                  <td>{payment.recordedByName ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}