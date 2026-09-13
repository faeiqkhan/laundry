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
  whatsAppEnabled: boolean;
  whatsAppPhoneNumberId: string;
  whatsAppAccessToken: string;
  whatsAppMode: string;
  whatsAppWelcomeTemplate: string;
  whatsAppInvoiceTemplate: string;
  whatsAppStatusTemplate: string;
  whatsAppProvider: string;
  whatsAppTestMode: boolean;
  whatsAppTestNumber: string;
  whatsAppAutoWelcome: boolean;
  whatsAppAutoInvoice: boolean;
  whatsAppAutoStatus: boolean;
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
  whatsAppEnabled?: boolean;
  whatsAppPhoneNumberId?: string;
  whatsAppAccessToken?: string;
  whatsAppMode?: string;
  whatsAppWelcomeTemplate?: string;
  whatsAppInvoiceTemplate?: string;
  whatsAppStatusTemplate?: string;
  whatsAppProvider?: string;
  whatsAppTestMode?: boolean;
  whatsAppTestNumber?: string;
  whatsAppAutoWelcome?: boolean;
  whatsAppAutoInvoice?: boolean;
  whatsAppAutoStatus?: boolean;
}

export const getSettings = async () => {
  const res = await api.get<{ data: Settings }>("/settings");
  return res.data.data;
};

export const updateSettings = async (payload: SettingsPayload) => {
  const res = await api.put<{ data: Settings }>("/settings", payload);
  return res.data.data;
};
