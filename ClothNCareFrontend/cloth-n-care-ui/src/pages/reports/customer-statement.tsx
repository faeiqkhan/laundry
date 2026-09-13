import { useEffect, useMemo, useState } from "react";
import { getCustomers, getCustomerById, type Customer } from "../../api/customers";
import ReportTable, { type Column } from "../../components/ReportTable";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { formatDate, formatMoney } from "../../utils/format";

export default function CustomerStatementReport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);

  useEffect(() => {
    let ignore = false;

    getCustomers()
      .then((data) => {
        if (!ignore) setCustomers(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const loadStatement = async (customerId: string) => {
    if (!customerId) {
      setOrders([]);
      return;
    }
    setLoadingStatement(true);
    try {
      const detail = await getCustomerById(customerId);
      setOrders(detail.orders ?? []);
    } catch (err) {
      console.error(err);
      window.alert("Failed to load customer statement");
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleSelect = (customerId: string) => {
    setSelectedId(customerId);
    loadStatement(customerId);
  };

  const selected = customers.find((customer) => customer.id === selectedId);

  const totals = useMemo(
    () => ({
      count: orders.length,
      billed: orders.reduce((sum, order) => sum + order.totalPrice, 0),
      paid: orders.reduce((sum, order) => sum + order.paidAmount, 0),
      due: orders.reduce((sum, order) => sum + order.balanceDue, 0),
    }),
    [orders],
  );

  const statement = useMemo(
    () =>
      [...orders]
        .filter((order) => order.status !== "CANCELLED")
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
    [orders],
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
    {
      key: "date",
      header: "Date",
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
      header: "Billed",
      align: "right",
      render: (row) => formatMoney(row.totalPrice),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      render: (row) => formatMoney(row.paidAmount),
    },
    {
      key: "due",
      header: "Balance",
      align: "right",
      render: (row) => <strong>{formatMoney(row.balanceDue)}</strong>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  if (loading) {
    return <div className="empty-state">Loading customers...</div>;
  }

  return (
    <>
      <div className="toolbar-row">
        <select
          className="filter-select"
          value={selectedId}
          onChange={(event) => handleSelect(event.target.value)}
        >
          <option value="">Select a customer...</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} {customer.phone ? `· ${customer.phone}` : ""}
            </option>
          ))}
        </select>
      </div>

      {!selected ? (
        <div className="empty-state">Select a customer to view their statement</div>
      ) : loadingStatement ? (
        <div className="empty-state">Loading statement...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-card-top">
                <span className="stat-card-label">Orders</span>
              </div>
              <div className="stat-card-value">{totals.count}</div>
              <div className="stat-card-sub">{selected.name}</div>
            </div>
            <div className="stat-card teal">
              <div className="stat-card-top">
                <span className="stat-card-label">Total Billed</span>
              </div>
              <div className="stat-card-value">{formatMoney(totals.billed)}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-top">
                <span className="stat-card-label">Total Paid</span>
              </div>
              <div className="stat-card-value">{formatMoney(totals.paid)}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-card-top">
                <span className="stat-card-label">Balance Due</span>
              </div>
              <div className="stat-card-value">{formatMoney(totals.due)}</div>
            </div>
          </div>

          <ReportTable
            columns={columns}
            rows={statement}
            rowKey={(row) => row.id}
            empty="No orders for this customer"
          />
        </>
      )}
    </>
  );
}