import api from "./axios";
import type { Order } from "../types/order";

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
