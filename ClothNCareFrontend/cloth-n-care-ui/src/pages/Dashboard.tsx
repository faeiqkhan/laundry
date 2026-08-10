import { useEffect, useState } from "react";
import {
  getDashboard,
  getAnalytics,
  type DashboardSummary,
  type AnalyticsData,
} from "../api/dashboard";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
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
import { formatMoneyShort } from "../utils/format";

const COLORS = [
  "#4f46e5",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0d9488",
  "#e11d48",
];

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
        <div className="empty-state">Loading dashboard...</div>
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
      <div className="page-header">
        <div className="page-header-text">
          <h1>Dashboard</h1>
          <p>Overview of today's activity and business analytics</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-top">
            <h3>Today's Orders</h3>
            <div className="stat-card-icon">
              <Icon name="orders" size={20} />
            </div>
          </div>
          <div className="stat-card-value">{summary.todayOrders}</div>
          <div className="stat-card-sub">Orders received today</div>
        </div>

        <div className="stat-card success">
          <div className="stat-card-top">
            <h3>Today's Revenue</h3>
            <div className="stat-card-icon">
              <Icon name="money" size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {formatMoneyShort(summary.todayRevenue)}
          </div>
          <div className="stat-card-sub">Revenue generated today</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-card-top">
            <h3>Pending Orders</h3>
            <div className="stat-card-icon">
              <Icon name="clock" size={20} />
            </div>
          </div>
          <div className="stat-card-value">{summary.pendingOrders}</div>
          <div className="stat-card-sub">Waiting to be processed</div>
        </div>
      </div>

      {admin && analytics && (
        <>
          <div className="section-title">
            <Icon name="reports" size={18} />
            Analytics
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Orders</span>
              <span className="kpi-value">{analytics.totalOrders}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Revenue</span>
              <span className="kpi-value accent">
                {formatMoneyShort(analytics.totalRevenue)}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Avg Order Value</span>
              <span className="kpi-value">
                {formatMoneyShort(analytics.avgOrderValue)}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Conversion Rate</span>
              <span className="kpi-value good">
                {analytics.conversionRate.toFixed(1)}%
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Customers</span>
              <span className="kpi-value">{analytics.totalCustomers}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Retention Rate</span>
              <span className="kpi-value">
                {analytics.retentionRate}%
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Projected Revenue (30d)</span>
              <span className="kpi-value accent">
                {formatMoneyShort(analytics.projectedRevenue)}
              </span>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Revenue by Service</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByServiceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const num = typeof value === "number" ? value : 0;
                      return [formatMoneyShort(num), "Revenue"];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#4f46e5"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Orders by Status</h3>
              <ResponsiveContainer width="100%" height={280}>
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
              <h3 className="chart-title">Daily Revenue & Orders Trend (7 days)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => {
                      const num = typeof value === "number" ? value : 0;
                      const label = typeof name === "string" ? name : "";
                      return [
                        label === "revenue" ? formatMoneyShort(num) : num,
                        label === "revenue" ? "Revenue" : "Orders",
                      ];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.12}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
