import { useEffect, useState } from "react";
import {
  getDashboard,
  getAnalytics,
  type DashboardSummary,
  type AnalyticsData,
} from "../api/dashboard";
import DashboardLayout from "../layout/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Line,
  Legend,
} from "recharts";
import { isAdmin } from "../utils/auth";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#ef4444", "#7c3aed", "#6b7280"];

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const admin = isAdmin();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDashboard();
        setSummary(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!admin) return;

    const fetchAnalytics = async () => {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAnalytics();
  }, [admin]);

  if (loading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  const statusChartData = analytics
    ? Object.entries(analytics.ordersByStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const revenueByServiceData = analytics
    ? Object.entries(analytics.revenueByService).map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
    : [];

  return (
    <DashboardLayout>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today Orders</h3>
          <p>{summary.todayOrders}</p>
        </div>

        <div className="stat-card">
          <h3>Revenue</h3>
          <p>{"\u20b9"}{summary.todayRevenue}</p>
        </div>

        <div className="stat-card">
          <h3>Pending</h3>
          <p>{summary.pendingOrders}</p>
        </div>
      </div>

      {admin && analytics && (
        <>
          <div className="analytics-section">
            <h2 className="section-title">Analytics</h2>

            <div className="analytics-kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Total Orders</span>
                <span className="kpi-value">{analytics.totalOrders}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Total Revenue</span>
                <span className="kpi-value">{"\u20b9"}{Math.round(analytics.totalRevenue)}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Avg Order Value</span>
                <span className="kpi-value">{"\u20b9"}{Math.round(analytics.avgOrderValue)}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Conversion Rate</span>
                <span className="kpi-value">{analytics.conversionRate.toFixed(1)}%</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Total Customers</span>
                <span className="kpi-value">{analytics.totalCustomers}</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Retention Rate</span>
                <span className="kpi-value">{analytics.retentionRate}%</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Projected Revenue</span>
                <span className="kpi-value projected">{"\u20b9"}{Math.round(analytics.projectedRevenue)}</span>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3 className="chart-title">Revenue by Service</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueByServiceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: unknown) => {
                        const num = typeof value === "number" ? value : 0;
                        return [`\u20b9${num}`, "Revenue"];
                      }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Orders by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card full-width">
                <h3 className="chart-title">Daily Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => {
                        const num = typeof value === "number" ? value : 0;
                        const label = typeof name === "string" ? name : "";
                        return [
                          label === "revenue" ? `\u20b9${num}` : num,
                          label === "revenue" ? "Revenue" : "Orders",
                        ];
                      }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.15}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}