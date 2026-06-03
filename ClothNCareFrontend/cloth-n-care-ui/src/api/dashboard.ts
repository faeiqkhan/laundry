import api from "./axios";

export interface DashboardSummary {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsData {
  ordersByStatus: Record<string, number>;
  revenueByService: Record<string, number>;
  dailyRevenue: DailyRevenue[];
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  totalOrders: number;
  totalCustomers: number;
  retentionRate: number;
  projectedRevenue: number;
}

export const getDashboard = async () => {
  const res = await api.get<{ data: DashboardSummary }>("/dashboard/summary");

  return res.data.data;
};

export const getAnalytics = async () => {
  const res = await api.get<{ data: AnalyticsData }>("/dashboard/analytics");

  return res.data.data;
};
