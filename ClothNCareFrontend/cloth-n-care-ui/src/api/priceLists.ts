import api from "./axios";

export type PriceListEntryType = "SERVICE" | "PRODUCT";

export interface PriceListEntry {
  itemType: PriceListEntryType;
  itemName: string;
  price: number;
}

export interface PriceList {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  entries: PriceListEntry[];
}

export interface PriceListPayload {
  name: string;
  description?: string;
  entries: PriceListEntry[];
}

export const getPriceLists = async () => {
  const res = await api.get<{ data: PriceList[] }>("/price-lists");
  return res.data.data;
};

export const getPriceList = async (id: string) => {
  const res = await api.get<{ data: PriceList }>(`/price-lists/${id}`);
  return res.data.data;
};

export const createPriceList = async (payload: PriceListPayload) => {
  const res = await api.post<{ data: PriceList }>("/price-lists", payload);
  return res.data.data;
};

export const updatePriceList = async (
  id: string,
  payload: PriceListPayload,
) => {
  const res = await api.put<{ data: PriceList }>(`/price-lists/${id}`, payload);
  return res.data.data;
};

export const deletePriceList = async (id: string) => {
  await api.delete(`/price-lists/${id}`);
};

export const activatePriceList = async (id: string) => {
  const res = await api.post<{ data: PriceList }>(`/price-lists/${id}/activate`);
  return res.data.data;
};
