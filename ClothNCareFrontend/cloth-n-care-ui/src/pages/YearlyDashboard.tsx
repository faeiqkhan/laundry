import { useEffect, useMemo, useState } from "react";
import { getYearly, type YearlyData } from "../api/dashboard";
import DashboardLayout from "../layout/DashboardLayout";
import { formatMoney, formatMoneyShort } from "../utils/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTH_COLORS: Record<string, string> = {
  January: "#6366f1",
  February: "#0ea5e9",
  March: "#06b6d4",
  April: "#8b5cf6",
  May: "#f59e0b",
  June: "#10b981",
  July: "#14b8a6",
  August: "#4f46e5",
  September: "#f43f5e",
  October: "#0d9488",
  November: "#a855f7",
  December: "#eab308",
};

export default function YearlyDashboardPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<YearlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  useEffect(() => {
    let ignore = false;

    getYearly(year)
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load yearly dashboard");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [year]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Yearly Dashboard</h1>
          <p>Month-by-month performance for the selected year</p>
        </div>

        <div className="page-header-actions">
          <select
            className="filter-select"
            value={year}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setYear(Number(event.target.value));
            }}
            aria-label="Select year"
          >
            {years.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading yearly dashboard...</div>
      ) : error || !data ? (
        <div className="empty-state">{error || "No data available"}</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-primary">
              <div className="stat-label">Yearly Revenue</div>
              <div className="stat-value">{formatMoney(data.totalRevenue)}</div>
              <div className="stat-footer">{data.totalOrders} orders in {data.year}</div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-label">Collected</div>
              <div className="stat-value">{formatMoney(data.totalPaid)}</div>
              <div className="stat-footer">Payments received</div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-label">Net Profit</div>
              <div className="stat-value">{formatMoney(data.netProfit)}</div>
              <div className="stat-footer">
                {formatMoney(data.totalExpenses)} expenses
              </div>
            </div>

            <div className="stat-card stat-teal">
              <div className="stat-label">Best Month</div>
              <div className="stat-value">{data.bestMonthName}</div>
              <div className="stat-footer">
                {formatMoney(data.bestMonthRevenue)} revenue
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Monthly Revenue {data.year}</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(value: number) => formatMoneyShort(value)}
                />
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
                <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {data.months.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={MONTH_COLORS[entry.monthName] ?? "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Revenue vs Collections vs Expenses</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 12, fill: "#64748b" }}
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
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="table-card">
            <div className="card-title-row">
              <h3>Monthly Breakdown</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Collected</th>
                  <th>Expenses</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((entry) => (
                  <tr key={entry.month}>
                    <td style={{ fontWeight: 700 }}>{entry.monthName}</td>
                    <td className="cell-muted">{entry.orders}</td>
                    <td className="cell-total">{formatMoney(entry.revenue)}</td>
                    <td>{formatMoney(entry.paid)}</td>
                    <td>{formatMoney(entry.expenses)}</td>
                    <td className={entry.paid - entry.expenses >= 0 ? "amount-paid" : "amount-due"}>
                      {formatMoney(entry.paid - entry.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Summary</h3>
            </div>
            <div className="report-summary-grid">
              <div className="report-summary-item">
                <span>Year</span>
                <strong>{data.year}</strong>
              </div>
              <div className="report-summary-item">
                <span>Total Orders</span>
                <strong>{data.totalOrders}</strong>
              </div>
              <div className="report-summary-item">
                <span>Delivered</span>
                <strong>{data.totalDelivered}</strong>
              </div>
              <div className="report-summary-item">
                <span>Revenue</span>
                <strong>{formatMoney(data.totalRevenue)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Collected</span>
                <strong>{formatMoney(data.totalPaid)}</strong>
              </div>
              <div className="report-summary-item">
                <span>Net Profit</span>
                <strong>{formatMoney(data.netProfit)}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
