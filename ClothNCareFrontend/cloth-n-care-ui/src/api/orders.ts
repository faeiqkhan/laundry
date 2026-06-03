import api from "./axios";
import type { Order } from "../types/order";

export interface OrderItem {
  service_type: string;
  product_type: string;
  quantity: number;
}

export interface CreateOrderPayload {
  customerId?: string;
  email?: string;
  phone?: string;
  items: OrderItem[];
  expected_delivery_date: string;
}

export const getOrders = async () => {
  const res = await api.get<{ data: Order[] }>("/orders");

  return res.data.data;
};

export const getOrderById = async (id: string) => {
  const res = await api.get<{ data: Order }>(`/orders/${id}`);

  return res.data.data;
};

export const createOrder = async (payload: CreateOrderPayload) => {
  const res = await api.post<{ data: Order }>("/orders", payload);

  return res.data.data;
};

export const updateOrderStatus = async (id: string, status: string) => {
  await api.put(`/orders/${id}/status?status=${status}`);
};
