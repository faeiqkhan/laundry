import api from "./axios";
import type { Order, PaymentMethod } from "../types/order";

export interface OrderItemPayload {
  product_id?: string;
  product_name?: string;
  service_type?: string;
  product_type?: string;
  uom?: string;
  quantity?: number;
  unit_price?: number;
}

export interface CreateOrderPayload {
  customerId?: string;
  email?: string;
  phone?: string;
  items: OrderItemPayload[];
  expected_delivery_date: string;
  discount?: number;
}

export interface PaymentRequest {
  amount: number;
  method: PaymentMethod;
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
  const res = await api.put<{ data: Order }>(`/orders/${id}/status?status=${status}`);
  return res.data.data;
};

export const recordPayment = async (id: string, payload: PaymentRequest) => {
  const res = await api.post<{ data: Order }>(`/orders/${id}/payment`, payload);
  return res.data.data;
};

export const deleteOrder = async (id: string) => {
  const res = await api.delete<{ data: null }>(`/orders/${id}`);
  return res.data.data;
};
