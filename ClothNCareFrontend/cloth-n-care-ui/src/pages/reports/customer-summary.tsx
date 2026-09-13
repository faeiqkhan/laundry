import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import { getCustomers, type Customer } from "../../api/customers";
import ReportTable, { type Column } from "../../components/ReportTable";
import type { Order } from "../../types/order";
import { formatMoney, formatMoneyShort } from "../../utils/format";

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  paid: number;
  balance: number;
}

export default function CustomerSummaryReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    Promise.all([getOrders(), getCustomers()])
      .then(([orderData, customerData]) => {
        if (!ignore) {
          setOrders(orderData);
          setCustomers(customerData);
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

  const rows = useMemo<CustomerRow[]>(() => {
    const active = new Set(
      orders.map((order) => order.customerPhone?.replace(/\D/g, "") ?? ""),
    );

    const byKey = new Map<string, CustomerRow>();
    const getKey = (order: Order) =>
      order.customerPhone?.replace(/\D/g, "") || order.customerName || order.id;

    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      const key = getKey(order);
      const row =
        byKey.get(key) ??
        ({
          key,
          name: order.customerName ?? "-",
          phone: order.customerPhone ?? "-",
          orders: 0,
          totalSpent: 0,
          paid: 0,
          balance: 0,
        } satisfies CustomerRow);
      row.orders += 1;
      row.totalSpent += order.totalPrice;
      row.paid += order.paidAmount;
      row.balance += order.balanceDue;
      byKey.set(key, row);
    }

    for (const customer of customers) {
      if (active.has(customer.phone.replace(/\D/g, ""))) continue;
      const key = `customer-${customer.id}`;
      byKey.set(key, {
        key,
        name: customer.name,
        phone: customer.phone,
        orders: 0,
        totalSpent: 0,
        paid: 0,
        balance: 0,
      });
    }

    return Array.from(byKey.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders, customers]);

  const totals = useMemo(
    () => ({ customers: rows.length, billed: 0, paid: 0 }),
    [rows],
  );

  const billed = useMemo(
    () => rows.reduce((sum, row) => sum + row.totalSpent, 0),
    [rows],
  );
  const totalPaid = useMemo(
    () => rows.reduce((sum, row) => sum + row.paid, 0),
    [rows],
  );
  const netBalance = useMemo(
    () => rows.reduce((sum, row) => sum + row.balance, 0),
    [rows],
  );

  const columns: Column<CustomerRow>[] = [
    { key: "name", header: "Customer", render: (row) => <strong>{row.name}</strong> },
    { key: "phone", header: "Phone", render: (row) => row.phone || "-" },
    { key: "orders", header: "Orders", align: "right", render: (row) => row.orders },
    {
      key: "spent",
      header: "Total Spent",
      align: "right",
      render: (row) => formatMoney(row.totalSpent),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      className: "cell-muted",
      render: (row) => formatMoney(row.paid),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (row) =>
        row.balance > 0 ? (
          <strong>{formatMoney(row.balance)}</strong>
        ) : (
          <span className="cell-muted">{formatMoney(row.balance)}</span>
        ),
    },
  ];

  if (loading) return <div className="empty-state">Loading customer summary...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-top">
            <span className="stat-card-label">Customers</span>
          </div>
          <div className="stat-card-value">{totals.customers}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Billed</span>
          </div>
          <div className="stat-card-value">{formatMoneyShort(billed)}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Paid</span>
          </div>
          <div className="stat-card-value">{formatMoneyShort(totalPaid)}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-card-top">
            <span className="stat-card-label">Net Balance</span>
          </div>
          <div className="stat-card-value">{formatMoney(netBalance)}</div>
        </div>
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        empty="No customer activity found"
      />
    </>
  );
}