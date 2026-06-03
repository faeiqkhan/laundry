import api from "./axios";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt?: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
}

export const getCustomers = async () => {
  const res = await api.get<{ data: Customer[] }>("/customers");

  return res.data.data;
};


export const createCustomer = async (payload: CreateCustomerPayload) => {
  const res = await api.post<{ data: Customer }>("/customers", payload);
  return res.data.data;
};

export const getCustomerSummaries = async () => {
  const res = await api.get<{ data: CustomerSummary[] }>("/customers/summary");

  return res.data.data;
};
