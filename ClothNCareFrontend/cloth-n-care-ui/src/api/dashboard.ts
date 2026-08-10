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

export interface AnalyticalData {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalExpenses: number;
  netProfit: number;
  avgOrderValue: number;
  totalOrders: number;
  totalDelivered: number;
  totalCustomers: number;
  ordersByStatus: Record<string, number>;
  revenueByService: Record<string, number>;
  paymentByMethod: Record<string, number>;
  dailyRevenue: { date: string; revenue: number; orders: number; paid: number }[];
  expensesByCategory: { category: string; amount: number }[];
  topCustomers: { name: string; phone: string; orderCount: number; totalSpent: number }[];
}

export interface YearlyData {
  year: number;
  totalRevenue: number;
  totalPaid: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  totalDelivered: number;
  bestMonthRevenue: number;
  bestMonthName: string;
  months: {
    month: number;
    monthName: string;
    revenue: number;
    paid: number;
    expenses: number;
    orders: number;
  }[];
}

export const getAnalytical = async (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await api.get<{ data: AnalyticalData }>(
    `/dashboard/analytical${params.toString() ? `?${params.toString()}` : ""}`,
  );

  return res.data.data;
};

export const getYearly = async (year?: number) => {
  const res = await api.get<{ data: YearlyData }>(
    `/dashboard/yearly${year ? `?year=${year}` : ""}`,
  );

  return res.data.data;
};
