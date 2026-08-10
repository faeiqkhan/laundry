import api from "./axios";

export type ChargeCalculation = "FLAT" | "PERCENT";

export interface ChargeType {
  id: string;
  name: string;
  calculation: ChargeCalculation;
  defaultAmount: number;
  active: boolean;
}

export interface ChargeTypePayload {
  name: string;
  calculation?: ChargeCalculation;
  defaultAmount?: number;
  active?: boolean;
}

export const getChargeTypes = async () => {
  const res = await api.get<{ data: ChargeType[] }>("/charge-types");
  return res.data.data;
};

export const createChargeType = async (payload: ChargeTypePayload) => {
  const res = await api.post<{ data: ChargeType }>("/charge-types", payload);
  return res.data.data;
};

export const updateChargeType = async (
  id: string,
  payload: ChargeTypePayload,
) => {
  const res = await api.put<{ data: ChargeType }>(`/charge-types/${id}`, payload);
  return res.data.data;
};

export const deleteChargeType = async (id: string) => {
  await api.delete(`/charge-types/${id}`);
};
