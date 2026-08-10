import api from "./axios";

export interface Expense {
  id: string;
  category: string;
  expenseHeadId?: string;
  description?: string;
  amount: number;
  expenseDate: string;
  createdAt: string;
  createdByName?: string;
}

export interface ExpensePayload {
  category: string;
  expenseHeadId?: string;
  description?: string;
  amount: number;
  expenseDate: string;
}

export const getExpenses = async (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await api.get<{ data: Expense[] }>(
    `/expenses${params.toString() ? `?${params.toString()}` : ""}`,
  );
  return res.data.data;
};

export const createExpense = async (payload: ExpensePayload) => {
  const res = await api.post<{ data: Expense }>("/expenses", payload);
  return res.data.data;
};

export const createExpenses = async (payloads: ExpensePayload[]) => {
  const res = await api.post<{ data: Expense[] }>("/expenses/bulk", payloads);
  return res.data.data;
};

export const deleteExpense = async (id: string) => {
  await api.delete(`/expenses/${id}`);
};
