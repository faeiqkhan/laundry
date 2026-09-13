import { useEffect, useMemo, useState } from "react";
import {
  getReports,
  type ReportsData,
} from "../../api/reports";
import {
  daysAgoISO,
  formatDate,
  formatMoney,
  formatMoneyShort,
  todayISO,
} from "../../utils/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#6366f1",
  WASHING: "#0ea5e9",
  DRYING: "#06b6d4",
  FOLDING: "#8b5cf6",
  IRONING: "#f59e0b",
  READY: "#10b981",
  DELIVERED: "#14b8a6",
  CANCELLED: "#ef4444",
};

export default function ReportsOverview() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { from, to } = useMemo(() => {
    if (range === "7") return { from: daysAgoISO(7), to: todayISO() };
    if (range === "60") return { from: daysAgoISO(60), to: todayISO() };
    if (range === "90") return { from: daysAgoISO(90), to: todayISO() };
    return { from: daysAgoISO(30), to: todayISO() };
  }, [range]);

  useEffect(() => {
    let ignore = false;

    getReports(from, to)
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load reports");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [from, to]);

  const revenueByService = useMemo(
    () =>
      data
        ? Object.entries(data.revenueByService)
            .map(([serviceName, revenue]) => ({ serviceName, revenue }))
            .sort((a, b) => b.revenue - a.revenue)
        : [],
    [data],
  );

  const ordersByStatus = useMemo(
    () =>
      data
        ? Object.entries(data.ordersByStatus).map(([status, count]) => ({
            status,
            count,
          }))
        : [],
    [data],
  );

  const activeOrders = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, data.totalOrders - data.totalDelivered);
  }, [data]);

  const netProfit = useMemo(() => {
    if (!data) return 0;
    return data.totalPaid - data.totalExpenses;
  }, [data]);

  return (
    <>
      <div className="page-header-actions">
        <select
          className="filter-select"
          value={range}
          onChange={(event) => {
            setLoading(true);
            setError("");
            setRange(event.target.value);
          }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Loading reports...</div>
      ) : error || !data ? (
        <div className="empty-state">{error || "No data available"}</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-primary">
              <div className="stat-label">Revenue</div>
              <div className="stat-value">{formatMoney(data.totalRevenue)}</div>
              <div className="stat-footer">{data.totalOrders} orders in period</div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-label">Collected</div>
              <div className="stat-value">{formatMoney(data.totalPaid)}</div>
              <div className="stat-footer">Payments received</div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-label">Outstanding</div>
              <div className="stat-value">
                {formatMoney(data.totalOutstanding)}
              </div>
              <div className="stat-footer">{data.pendingPayments.length} pending</div>
            </div>

            <div className="stat-card stat-teal">
              <div className="stat-label">Active Orders</div>
              <div className="stat-value">{activeOrders}</div>
              <div className="stat-footer">Not yet delivered</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Revenue by Service</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByService}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="serviceName"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(value: number) => formatMoneyShort(value)}
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const num = typeof value === "number" ? value : 0;
                      return [formatMoney(num), "Revenue"];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Orders by Status</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {ordersByStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      typeof value === "number" ? value : 0,
                      typeof name === "string" ? name : "",
                    ]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-card">
            <div className="card-title-row">
              <h3>Pending Payments</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-empty">All payments settled</div>
                    </td>
                  </tr>
                ) : (
                  data.pendingPayments.map((pending) => (
                    <tr key={pending.orderId}>
                      <td style={{ fontWeight: 700 }}>
                        #{pending.invoiceNumber || pending.orderId}
                      </td>
                      <td>{pending.customerName || "-"}</td>
                      <td>{formatMoney(pending.total)}</td>
                      <td>{formatMoney(pending.paid)}</td>
                      <td className="cell-total">{formatMoney(pending.due)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-card">
            <div className="card-title-row">
              <h3>Top Customers</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-empty">No customer activity</div>
                    </td>
                  </tr>
                ) : (
                  data.topCustomers.map((customer, index) => (
                    <tr key={`${customer.name}-${index}`}>
                      <td className="cell-muted">{index + 1}</td>
                      <td style={{ fontWeight: 700 }}>{customer.name}</td>
                      <td>{customer.phone || "-"}</td>
                      <td className="cell-muted">{customer.orderCount}</td>
                      <td className="cell-total">{formatMoney(customer.totalSpent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-card">
            <div className="card-title-row">
              <h3>Expenses by Category</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.expensesByCategory.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <div className="table-empty">No expenses recorded</div>
                    </td>
                  </tr>
                ) : (
                  data.expensesByCategory.map((entry) => (
                    <tr key={entry.category}>
                      <td style={{ fontWeight: 700 }}>{entry.category}</td>
                      <td className="cell-total">{formatMoney(entry.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Summary</h3>
            </div>
            <div className="report-summary-grid">
              <div className="report-summary-item">
                <span>Total Orders</span>
                <strong>{data.totalOrders}</strong>
              </div>
              <div className="report-summary-item">
                <span>Delivered</span>
                <strong>{data.totalDelivered}</strong>
              </div>
              <div className="report-summary-item">
                <span>Customers</span>
                <strong>{data.totalCustomers}</strong>
              </div>
              <div className="report-summary-item">
                <span>Expenses</span>
                <strong>{formatMoney(data.totalExpenses)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Net Profit</span>
                <strong>{formatMoney(netProfit)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Period</span>
                <strong>
                  {formatDate(from)} – {formatDate(to)}
                </strong>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}