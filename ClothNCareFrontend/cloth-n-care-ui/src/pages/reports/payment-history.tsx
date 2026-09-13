import { useEffect, useMemo, useState } from "react";
import {
  getPayments,
  type PaymentRecord,
} from "../../api/payments";
import ReportTable, { type Column } from "../../components/ReportTable";
import { PAYMENT_METHOD_LABELS } from "../../types/order";
import {
  daysAgoISO,
  formatDateTime,
  formatMoney,
  todayISO,
} from "../../utils/format";

export default function PaymentHistoryReport() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());

  const applyRange = () => {
    setLoading(true);
    getPayments(from || undefined, to || undefined)
      .then(setPayments)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

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

  const total = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const columns: Column<PaymentRecord>[] = [
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
    {
      key: "method",
      header: "Method",
      render: (row) =>
        PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS] ??
        row.method,
    },
    {
      key: "date",
      header: "Paid At",
      className: "cell-muted",
      render: (row) => formatDateTime(row.paidAt),
    },
    { key: "recorded", header: "Received By", render: (row) => row.recordedByName ?? "-" },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => <strong>{formatMoney(row.amount)}</strong>,
    },
  ];

  if (loading) {
    return <div className="empty-state">Loading payment history...</div>;
  }

  return (
    <>
      <div className="toolbar-row">
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
          </div>
          <div className="stat-card-value">{formatMoney(total)}</div>
          <div className="stat-card-sub">{payments.length} payments</div>
        </div>
      </div>

      <ReportTable
        columns={columns}
        rows={payments}
        rowKey={(row) => row.id}
        empty="No payments in this period"
      />
    </>
  );
}