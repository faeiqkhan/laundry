import api from "./axios";
import type { Order } from "../types/order";
import type { PageData } from "./orders";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface CustomerDetail extends Customer {
  orderCount: number;
  totalSpent: number;
  orders: Order[];
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
}

export interface CustomerPayload {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export const getCustomers = async () => {
  const res = await api.get<{ data: Customer[] }>("/customers");
  return res.data.data;
};

export const getCustomerPage = async (params: {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
}) => {
  // See getOrderPage: keep the list screens working while the backend paging
  // query is repaired by requesting the established non-paginated endpoint.
  const res = await api.get<{ data: Customer[] }>("/customers");
  const data = res.data.data;
  const page = Math.max(params.page ?? 0, 0);
  const size = Math.max(params.size ?? 10, 1);
  const term = params.q?.trim().toLowerCase();
  const filtered = data.filter((customer) => {
    if (!term) return true;
    return [customer.name, customer.phone, customer.email].some(
      (value) => value?.toLowerCase().includes(term),
    );
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
  } satisfies PageData<Customer>;
};

export const createCustomer = async (payload: CustomerPayload) => {
  const res = await api.post<{ data: Customer }>("/customers", payload);
  return res.data.data;
};

export const updateCustomer = async (id: string, payload: CustomerPayload) => {
  const res = await api.put<{ data: Customer }>(`/customers/${id}`, payload);
  return res.data.data;
};

export const getCustomerById = async (id: string) => {
  const res = await api.get<{ data: CustomerDetail }>(`/customers/${id}`);
  return res.data.data;
};

export const getCustomerSummaries = async () => {
  const res = await api.get<{ data: CustomerSummary[] }>("/customers/summary");
  return res.data.data;
};
