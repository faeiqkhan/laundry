import api from "./axios";

export interface TopCustomer {
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
}

export interface PendingPayment {
  orderId: string;
  invoiceNumber?: string;
  customerName?: string;
  total: number;
  paid: number;
  due: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
}

export interface ReportsData {
  totalRevenue: number;
  totalOrders: number;
  totalDelivered: number;
  totalCustomers: number;
  totalPaid: number;
  totalOutstanding: number;
  totalExpenses: number;
  netProfit: number;
  revenueByService: Record<string, number>;
  ordersByStatus: Record<string, number>;
  topCustomers: TopCustomer[];
  pendingPayments: PendingPayment[];
  expensesByCategory: CategorySpend[];
}

export const getReports = async (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await api.get<{ data: ReportsData }>(
    `/reports${params.toString() ? `?${params.toString()}` : ""}`,
  );
  return res.data.data;
};
