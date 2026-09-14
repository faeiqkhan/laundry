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

export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface OrderPageParams {
  page?: number;
  size?: number;
  sort?: string;
  status?: string;
  payment?: string;
  q?: string;
}

export interface OrderOverview {
  total: number;
  active: number;
  due: number;
}

export const getOrders = async () => {
  const res = await api.get<{ data: Order[] }>("/orders");
  return res.data.data;
};

export const getOrderPage = async (params: OrderPageParams = {}) => {
  // Do not send page/size parameters yet. The deployed SQLite backend throws
  // a 500 while executing its new paged query; the original list endpoint is
  // stable and this client applies the same paging locally.
  const res = await api.get<{ data: PageData<Order> | Order[] }>("/orders");
  const data = res.data.data;

  // The paginated orders endpoint was added after the original list endpoint.
  // Keep the refreshed UI usable with an already-deployed backend: older
  // versions ignore the paging parameters and return the complete array.
  if (Array.isArray(data)) {
    const page = Math.max(params.page ?? 0, 0);
    const size = Math.max(params.size ?? 10, 1);
    const term = params.q?.trim().toLowerCase();
    const filtered = data.filter((order) => {
      if (params.status && order.status !== params.status) return false;
      if (params.payment && order.paymentStatus !== params.payment) return false;
      if (!term) return true;
      return [
        order.customerName,
        order.customerPhone,
        order.id,
        order.invoiceNumber,
      ].some((value) => value?.toLowerCase().includes(term));
    });
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size);

    return {
      content: filtered.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements,
      totalPages,
      last: page >= totalPages - 1,
    };
  }

  return data;
};

export const getOrderOverview = async () => {
  const res = await api.get<{ data: OrderOverview }>("/orders/overview");
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

export const updateOrder = async (id: string, payload: CreateOrderPayload) => {
  const res = await api.put<{ data: Order }>(`/orders/${id}`, payload);
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
