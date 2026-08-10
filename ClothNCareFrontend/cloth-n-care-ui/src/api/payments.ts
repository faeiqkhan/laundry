import api from "./axios";
import type { PaymentMethod } from "../types/order";
import type { Order } from "../types/order";

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  recordedByName?: string;
  orderId?: string;
  invoiceNumber?: string;
  customerName?: string;
}

export const getPayments = async (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await api.get<{ data: PaymentRecord[] }>(
    `/payments${params.toString() ? `?${params.toString()}` : ""}`,
  );
  return res.data.data;
};

export const deletePayment = async (id: string) => {
  const res = await api.delete<{ data: Order }>(`/payments/${id}`);
  return res.data.data;
};
