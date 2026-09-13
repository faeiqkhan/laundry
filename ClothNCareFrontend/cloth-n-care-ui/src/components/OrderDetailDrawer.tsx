import { useState } from "react";
import type { Order, PaymentMethod } from "../types/order";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "../types/order";
import {
  recordPayment,
  updateOrderStatus,
  deleteOrder,
} from "../api/orders";
import StatusBadge from "./StatusBadge";
import Icon from "./Icons";
import {
  downloadInvoice,
  printInvoice,
  printOrderTag,
  ensureInvoice,
} from "../utils/invoice";
import { formatMoney, formatDateTime, formatDate } from "../utils/format";
import { canManage } from "../utils/auth";
import "./DashboardShell.css";

interface Props {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}

export default function OrderDetailDrawer({ order, onClose, onUpdated }: Props) {
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showAllItems, setShowAllItems] = useState(false);

  const terminal =
    order.status === "DELIVERED" || order.status === "CANCELLED";

  const nextStatuses = ORDER_STATUSES.filter(
    (status) => status !== order.status && status !== "RECEIVED",
  );

  const handlePay = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid payment amount");
      return;
    }
    if (amount > order.balanceDue) {
      setError(`Amount exceeds balance due (${formatMoney(order.balanceDue)})`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      await recordPayment(order.id, { amount, method: payMethod });
      setPayAmount("");
      onUpdated();
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Failed to record payment";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      setUpdating(true);
      await updateOrderStatus(order.id, status);
      onUpdated();
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Failed to update status";
      alert(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    const url = await ensureInvoice(order.id);
    if (url) {
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete order ${order.invoiceNumber ?? order.id.slice(0, 8)}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteOrder(order.id);
      onClose();
      onUpdated();
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Failed to delete order";
      window.alert(message);
    }
  };

  const visibleItems = showAllItems ? order.items ?? [] : (order.items ?? []).slice(0, 5);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Order details">
        <div className="drawer-header">
          <div>
            <h2>Order {order.invoiceNumber ?? order.id.slice(0, 8)}</h2>
            <span className="muted">Created {formatDateTime(order.createdAt)}</span>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item-label">Status</span>
              <div className="mt-16">
                <StatusBadge status={order.status} />
              </div>
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
              {order.customerPhone && (
                <div className="muted">{order.customerPhone}</div>
              )}
            </div>

            <div className="detail-item">
              <span className="detail-item-label">Created By</span>
              <span className="detail-item-value">{order.createdByName ?? "-"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-item-label">Expected Delivery</span>
              <span className="detail-item-value">
                {formatDate(order.expectedDeliveryDate)}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-item-label">Invoice No</span>
              <span className="detail-item-value">{order.invoiceNumber ?? "-"}</span>
            </div>
          </div>

          <div className="section-title">
            <Icon name="receipt" size={17} />
            Items
          </div>

          <div className="table-card mb-16">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.productName || item.serviceType}
                      <div className="muted">
                        {item.productName ? item.serviceType : item.productType}
                        {item.uom ? ` · ${item.uom}` : ""}
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unitPrice)}</td>
                    <td className="money">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(order.items?.length ?? 0) > 5 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm mb-16"
              onClick={() => setShowAllItems((show) => !show)}
            >
              {showAllItems ? "Show less" : `Show all items (${order.items?.length})`}
            </button>
          )}

          <div className="section-title">
            <Icon name="money" size={17} />
            Totals
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item-label">Total</span>
              <span className="detail-item-value money">{formatMoney(order.totalPrice)}</span>
            </div>

            <div className="detail-item">
              <span className="detail-item-label">Discount</span>
              <span className="detail-item-value money">
                {order.discount > 0 ? `-${formatMoney(order.discount)}` : formatMoney(0)}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-item-label">Tax</span>
              <span className="detail-item-value money">{formatMoney(order.taxAmount)}</span>
            </div>

            <div className="detail-item">
              <span className="detail-item-label">Paid</span>
              <span className="detail-item-value money amount-paid">
                {formatMoney(order.paidAmount)}
              </span>
            </div>

            <div className="detail-item full">
              <span className="detail-item-label">Balance Due</span>
              <span className="detail-item-value money amount-due">
                {formatMoney(order.balanceDue)}
              </span>
            </div>
          </div>

          {order.payments && order.payments.length > 0 && (
            <>
              <div className="section-title">
                <Icon name="check" size={17} />
                Payments Received
              </div>

              <div className="table-card mb-16">
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
                        <td>{formatDateTime(payment.paidAt)}</td>
                        <td className="money amount-paid">
                          {formatMoney(payment.amount)}
                        </td>
                        <td>{PAYMENT_METHOD_LABELS[payment.method]}</td>
                        <td>{payment.recordedByName ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {order.balanceDue > 0 && !terminal && (
            <>
              <div className="section-title">
                <Icon name="money" size={17} />
                Record Payment
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="pay-amount">Amount</label>
                  <input
                    id="pay-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder={`Due: ${formatMoney(order.balanceDue)}`}
                    value={payAmount}
                    onChange={(event) => setPayAmount(event.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="pay-method">Method</label>
                  <select
                    id="pay-method"
                    className="form-select"
                    value={payMethod}
                    onChange={(event) =>
                      setPayMethod(event.target.value as PaymentMethod)
                    }
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePay}
                disabled={saving}
              >
                {saving ? "Recording..." : "Record Payment"}
              </button>
            </>
          )}

          {!terminal && (
            <>
              <div className="section-title">
                <Icon name="clock" size={17} />
                Update Status
              </div>

              <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleStatusChange(status)}
                    disabled={updating}
                  >
                    Mark {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="icon-button"
            onClick={() => printOrderTag(order)}
          >
            <Icon name="tag" size={16} />
            Print Tag
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => printInvoice(order.invoiceUrl)}
          >
            <Icon name="printer" size={16} />
            Print Invoice
          </button>

          {order.invoiceUrl ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => downloadInvoice(order.invoiceUrl)}
            >
              <Icon name="download" size={16} />
              Download Invoice
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateInvoice}
            >
              <Icon name="receipt" size={16} />
              Generate Invoice
            </button>
          )}

          {canManage() && (
            <button
              type="button"
              className="icon-button danger"
              onClick={handleDelete}
            >
              <Icon name="trash" size={16} />
              Delete Order
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
