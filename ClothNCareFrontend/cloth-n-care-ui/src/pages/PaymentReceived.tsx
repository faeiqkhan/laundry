import { useEffect, useMemo, useState } from "react";
import { getCustomers, type Customer } from "../api/customers";
import { getOrders, recordPayment } from "../api/orders";
import { getPayments, deletePayment, type PaymentRecord } from "../api/payments";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import type { Order, PaymentMethod } from "../types/order";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../types/order";
import { formatMoney, formatDateTime } from "../utils/format";
import { downloadInvoice } from "../utils/invoice";
import { canManage } from "../utils/auth";

export default function PaymentReceivedPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchPayments = async () => {
    try {
      setPayments(await getPayments());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (!window.confirm("Delete this payment? The order balance and invoice will be updated.")) {
      return;
    }
    try {
      await deletePayment(payment.id);
      await fetchPayments();
      const refreshed = await getOrders();
      setOrders(refreshed);
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete payment");
    }
  };

  useEffect(() => {
    let ignore = false;

    Promise.all([getCustomers(), getOrders(), getPayments()])
      .then(([customerList, orderList, paymentList]) => {
        if (!ignore) {
          setCustomers(customerList);
          setOrders(orderList);
          setPayments(paymentList);
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

  const customerOrders = useMemo(() => {
    if (!customerId) return [];
    return orders
      .filter(
        (order) =>
          order.customerName !== undefined &&
          customers.find((customer) => customer.id === customerId)?.name ===
            order.customerName,
      )
      .filter((order) => order.balanceDue > 0 && order.status !== "CANCELLED");
  }, [orders, customers, customerId]);

  const selectedOrder = orders.find((order) => order.id === orderId);

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    setOrderId("");
    setAmount("");
    setError("");
    setSuccess("");
  };

  const handleOrderChange = (value: string) => {
    setOrderId(value);
    const order = orders.find((entry) => entry.id === value);
    setAmount(order ? order.balanceDue.toString() : "");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    if (!orderId) {
      setError("Select an order to receive payment for");
      return;
    }
    const amountNum = Number(amount);
    if (amount.trim() === "" || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid payment amount");
      return;
    }
    if (selectedOrder && amountNum > selectedOrder.balanceDue) {
      setError("Amount exceeds the balance due");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await recordPayment(orderId, { amount: amountNum, method });
      setSuccess(
        `Payment of ${formatMoney(amountNum)} received on ${selectedOrder?.invoiceNumber ?? orderId.slice(0, 8)}`,
      );
      const refreshed = await getOrders();
      setOrders(refreshed);
      setAmount("");
      setOrderId("");
      await fetchPayments();
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Payment Received</h1>
          <p>Record a payment against an order</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-card-top">
            <span className="stat-card-label">Collected (last 30 days)</span>
            <span className="stat-card-icon">
              <Icon name="money" size={18} />
            </span>
          </div>
          <div className="stat-card-value">
            {formatMoney(payments.reduce((sum, payment) => sum + payment.amount, 0))}
          </div>
          <div className="stat-card-sub">{payments.length} payments</div>
        </div>
      </div>

      <div className="table-card">
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>Record Payment</h2>
        <p className="cell-muted" style={{ margin: "0 0 16px" }}>
          Pick a customer and an order with an outstanding balance
        </p>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="pay-customer">Customer</label>
            <select
              id="pay-customer"
              className="form-input"
              value={customerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
            >
              <option value="">Select customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="pay-order">Order</label>
            <select
              id="pay-order"
              className="form-input"
              value={orderId}
              onChange={(event) => handleOrderChange(event.target.value)}
              disabled={!customerId}
            >
              <option value="">Select order...</option>
              {customerOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.invoiceNumber ?? order.id.slice(0, 8)} · due{" "}
                  {formatMoney(order.balanceDue)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="pay-amount">Amount</label>
            <input
              id="pay-amount"
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-field">
            <label htmlFor="pay-method">Method</label>
            <select
              id="pay-method"
              className="form-input"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((paymentMethod) => (
                <option key={paymentMethod} value={paymentMethod}>
                  {PAYMENT_METHOD_LABELS[paymentMethod]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedOrder && (
          <div className="detail-grid">
            <div>
              <span className="detail-label">Invoice</span>
              <span className="detail-value">
                {selectedOrder.invoiceNumber ?? selectedOrder.id.slice(0, 8)}
              </span>
            </div>
            <div>
              <span className="detail-label">Total</span>
              <span className="detail-value">
                {formatMoney(selectedOrder.totalPrice)}
              </span>
            </div>
            <div>
              <span className="detail-label">Already Paid</span>
              <span className="detail-value">
                {formatMoney(selectedOrder.paidAmount)}
              </span>
            </div>
            <div>
              <span className="detail-label">Balance Due</span>
              <span className="detail-value amount-due">
                {formatMoney(selectedOrder.balanceDue)}
              </span>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !orderId}
            className="btn btn-primary"
          >
            {saving ? "Recording..." : "Receive Payment"}
          </button>
        </div>
      </div>

      <div className="table-card">
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>Recent Payments</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Received By</th>
              {canManage() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={canManage() ? 7 : 6}>
                  <div className="table-empty">
                    <Icon name="money" size={32} className="table-empty-icon" />
                    <div>No payments recorded yet</div>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.invoiceNumber ?? payment.orderId?.slice(0, 8)}
                  </td>
                  <td>{payment.customerName ?? "-"}</td>
                  <td className="cell-total">{formatMoney(payment.amount)}</td>
                  <td>
                    <span className="badge badge-slate">
                      {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    </span>
                  </td>
                  <td className="cell-muted">
                    {formatDateTime(payment.paidAt)}
                  </td>
                  <td className="cell-muted">{payment.recordedByName ?? "-"}</td>
                  {canManage() && (
                    <td>
                      <button
                        type="button"
                        className="icon-button icon-only danger"
                        title="Delete payment"
                        onClick={() => handleDeletePayment(payment)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder?.invoiceUrl && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadInvoice(selectedOrder.invoiceUrl)}
          style={{ marginTop: 12 }}
        >
          <Icon name="receipt" size={16} />
          Download Invoice
        </button>
      )}
    </DashboardLayout>
  );
}
