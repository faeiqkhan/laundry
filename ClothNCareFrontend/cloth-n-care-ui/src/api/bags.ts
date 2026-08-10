import api from "./axios";

export type BagStatus = "AVAILABLE" | "ASSIGNED" | "RETURNED";

export interface StorageBag {
  id: string;
  bagNumber: string;
  size: string;
  status: BagStatus;
  notes: string;
}

export interface StorageBagPayload {
  bagNumber: string;
  size?: string;
  status?: BagStatus;
  notes?: string;
}

export const getBags = async () => {
  const res = await api.get<{ data: StorageBag[] }>("/bags");
  return res.data.data;
};

export const createBag = async (payload: StorageBagPayload) => {
  const res = await api.post<{ data: StorageBag }>("/bags", payload);
  return res.data.data;
};

export const updateBag = async (id: string, payload: StorageBagPayload) => {
  const res = await api.put<{ data: StorageBag }>(`/bags/${id}`, payload);
  return res.data.data;
};

export const deleteBag = async (id: string) => {
  await api.delete(`/bags/${id}`);
};
