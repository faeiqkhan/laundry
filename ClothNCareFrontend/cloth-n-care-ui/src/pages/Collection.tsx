import { useEffect, useMemo, useState } from "react";
import { getPayments, deletePayment, type PaymentRecord } from "../api/payments";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import { PAYMENT_METHOD_LABELS } from "../types/order";
import { formatMoney, formatDateTime, daysAgoISO, todayISO } from "../utils/format";
import { canManage } from "../utils/auth";

export default function CollectionPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());

  useEffect(() => {
    let ignore = false;

    getPayments(from || undefined, to || undefined)
      .then((data) => {
        if (!ignore) setPayments(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const byMethod = new Map<string, number>();
    for (const payment of payments) {
      byMethod.set(
        payment.method,
        (byMethod.get(payment.method) ?? 0) + payment.amount,
      );
    }
    return { total, count: payments.length, byMethod };
  }, [payments]);

  const applyRange = () => {
    setLoading(true);
    getPayments(from || undefined, to || undefined)
      .then(setPayments)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (!window.confirm("Delete this payment? The order balance and invoice will be updated.")) {
      return;
    }
    try {
      await deletePayment(payment.id);
      await applyRange();
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete payment");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading collection...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Collection</h1>
          <p>Payments received within a date range</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="date"
          className="filter-select"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="filter-select"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label="To date"
        />
        <button type="button" className="btn btn-primary" onClick={applyRange}>
          Apply
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Collected</span>
            <span className="stat-card-icon">
              <Icon name="money" size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatMoney(summary.total)}</div>
          <div className="stat-card-sub">{summary.count} payments</div>
        </div>

        {Array.from(summary.byMethod.entries()).map(([method, amount]) => (
          <div className="stat-card" key={method}>
            <div className="stat-card-top">
              <span className="stat-card-label">
                {PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method}
              </span>
              <span className="stat-card-icon">
                <Icon name="money" size={18} />
              </span>
            </div>
            <div className="stat-card-value">{formatMoney(amount)}</div>
          </div>
        ))}
      </div>

      <div className="table-card">
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
                    <div>No payments in this range</div>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.invoiceNumber ?? payment.orderId?.slice(0, 8)}</td>
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
    </DashboardLayout>
  );
}
