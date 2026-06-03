import api from "./axios";

export interface Service {
  id: string;
  name: string;
  productType: string;
  price: number;
  active: boolean;
}

export interface CreateServicePayload {
  name: string;
  productType: string;
  price: number;
  active?: boolean;
}

export const getServices = async () => {
  const res = await api.get<{ data: Service[] }>("/services");

  return res.data.data;
};

export const createService = async (payload: CreateServicePayload) => {
  const res = await api.post<{ data: Service }>("/services", payload);

  return res.data.data;
};

export const updateService = async (
  id: string,
  payload: CreateServicePayload,
) => {
  const res = await api.put<{ data: Service }>(`/services/${id}`, payload);

  return res.data.data;
};

export const deleteService = async (id: string) => {
  await api.delete(`/services/${id}`);
};
