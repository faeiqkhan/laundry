import api from "./axios";

export interface StorageRack {
  id: string;
  name: string;
  location: string;
  capacity: number;
  notes: string;
}

export interface StorageRackPayload {
  name: string;
  location?: string;
  capacity?: number;
  notes?: string;
}

export const getRacks = async () => {
  const res = await api.get<{ data: StorageRack[] }>("/racks");
  return res.data.data;
};

export const createRack = async (payload: StorageRackPayload) => {
  const res = await api.post<{ data: StorageRack }>("/racks", payload);
  return res.data.data;
};

export const updateRack = async (id: string, payload: StorageRackPayload) => {
  const res = await api.put<{ data: StorageRack }>(`/racks/${id}`, payload);
  return res.data.data;
};

export const deleteRack = async (id: string) => {
  await api.delete(`/racks/${id}`);
};
