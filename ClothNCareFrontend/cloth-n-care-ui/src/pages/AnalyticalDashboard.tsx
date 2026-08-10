import { useEffect, useMemo, useState } from "react";
import {
  getAnalytical,
  type AnalyticalData,
} from "../api/dashboard";
import DashboardLayout from "../layout/DashboardLayout";
import {
  daysAgoISO,
  formatDate,
  formatMoney,
  formatMoneyShort,
  todayISO,
} from "../utils/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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

const METHOD_COLORS: Record<string, string> = {
  CASH: "#10b981",
  CARD: "#4f46e5",
  ONLINE: "#0ea5e9",
  UPI: "#f59e0b",
};

export default function AnalyticalDashboardPage() {
  const [range, setRange] = useState("30");
  const [customFrom, setCustomFrom] = useState(daysAgoISO(30));
  const [customTo, setCustomTo] = useState(todayISO());
  const [data, setData] = useState<AnalyticalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { from, to } = useMemo(() => {
    if (range === "7") return { from: daysAgoISO(7), to: todayISO() };
    if (range === "60") return { from: daysAgoISO(60), to: todayISO() };
    if (range === "90") return { from: daysAgoISO(90), to: todayISO() };
    if (range === "custom")
      return { from: customFrom || daysAgoISO(30), to: customTo || todayISO() };
    return { from: daysAgoISO(30), to: todayISO() };
  }, [range, customFrom, customTo]);

  useEffect(() => {
    let ignore = false;

    getAnalytical(from, to)
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load analytical dashboard");
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

  const paymentByMethod = useMemo(
    () =>
      data
        ? Object.entries(data.paymentByMethod).map(([method, amount]) => ({
            method,
            amount,
          }))
        : [],
    [data],
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Analytical Dashboard</h1>
          <p>Deep dive into revenue, collections, and performance</p>
        </div>

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
            <option value="custom">Custom range</option>
          </select>

          {range === "custom" && (
            <>
              <input
                type="date"
                className="filter-select"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                aria-label="From date"
              />
              <input
                type="date"
                className="filter-select"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                aria-label="To date"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setRange("custom");
                }}
              >
                Apply
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading analytical dashboard...</div>
      ) : error || !data ? (
        <div className="empty-state">{error || "No data available"}</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-primary">
              <div className="stat-label">Total Revenue</div>
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
              <div className="stat-value">{formatMoney(data.totalOutstanding)}</div>
              <div className="stat-footer">Awaiting collection</div>
            </div>

            <div className="stat-card stat-teal">
              <div className="stat-label">Net Profit</div>
              <div className="stat-value">{formatMoney(data.netProfit)}</div>
              <div className="stat-footer">
                {formatMoney(data.totalExpenses)} expenses
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Avg Order Value</div>
              <div className="stat-value">{formatMoney(data.avgOrderValue)}</div>
              <div className="stat-footer">Per order</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Delivered</div>
              <div className="stat-value">{data.totalDelivered}</div>
              <div className="stat-footer">
                of {data.totalOrders} orders · {data.totalCustomers} customers
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Daily Revenue vs Collections</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(value: string) => value.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(value: number) => formatMoneyShort(value)}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    const num = typeof value === "number" ? value : 0;
                    return formatMoney(num);
                  }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  name="Collected"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Collections by Method</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={paymentByMethod}
                    dataKey="amount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {paymentByMethod.map((entry) => (
                      <Cell
                        key={entry.method}
                        fill={METHOD_COLORS[entry.method] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatMoney(typeof value === "number" ? value : 0),
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

            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Expenses by Category</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.expensesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(value: number) => formatMoneyShort(value)}
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const num = typeof value === "number" ? value : 0;
                      return [formatMoney(num), "Spent"];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    name="Spent"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
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

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Summary</h3>
            </div>
            <div className="report-summary-grid">
              <div className="report-summary-item">
                <span>Total Revenue</span>
                <strong>{formatMoney(data.totalRevenue)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Collected</span>
                <strong>{formatMoney(data.totalPaid)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Outstanding</span>
                <strong>{formatMoney(data.totalOutstanding)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Expenses</span>
                <strong>{formatMoney(data.totalExpenses)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Net Profit</span>
                <strong>{formatMoney(data.netProfit)}</strong>
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
    </DashboardLayout>
  );
}
