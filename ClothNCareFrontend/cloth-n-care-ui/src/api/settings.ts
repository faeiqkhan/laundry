import api from "./axios";

export interface Settings {
  businessName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  currencyCode: string;
  taxRate: number;
  invoiceFooter: string;
  termsAndConditions: string;
}

export interface SettingsPayload {
  businessName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  currencySymbol?: string;
  currencyCode?: string;
  taxRate?: number;
  invoiceFooter?: string;
  termsAndConditions?: string;
}

export const getSettings = async () => {
  const res = await api.get<{ data: Settings }>("/settings");
  return res.data.data;
};

export const updateSettings = async (payload: SettingsPayload) => {
  const res = await api.put<{ data: Settings }>("/settings", payload);
  return res.data.data;
};
