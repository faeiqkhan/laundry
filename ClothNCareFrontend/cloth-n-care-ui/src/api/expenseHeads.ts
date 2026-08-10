import api from "./axios";

export interface ExpenseHead {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface ExpenseHeadPayload {
  name: string;
  description?: string;
  active?: boolean;
}

export const getExpenseHeads = async () => {
  const res = await api.get<{ data: ExpenseHead[] }>("/expense-heads");
  return res.data.data;
};

export const createExpenseHead = async (payload: ExpenseHeadPayload) => {
  const res = await api.post<{ data: ExpenseHead }>("/expense-heads", payload);
  return res.data.data;
};

export const updateExpenseHead = async (
  id: string,
  payload: ExpenseHeadPayload,
) => {
  const res = await api.put<{ data: ExpenseHead }>(`/expense-heads/${id}`, payload);
  return res.data.data;
};

export const deleteExpenseHead = async (id: string) => {
  await api.delete(`/expense-heads/${id}`);
};
