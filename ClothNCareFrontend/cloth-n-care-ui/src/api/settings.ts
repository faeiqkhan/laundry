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
  upiId: string;
  storeSignaturePath: string;
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
  whatsAppAutoThankYou: boolean;
  whatsAppWelcomeMessage: string;
  whatsAppThankYouMessage: string;
  whatsAppStatusMessage: string;
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
  upiId?: string;
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
  whatsAppAutoThankYou?: boolean;
  whatsAppWelcomeMessage?: string;
  whatsAppThankYouMessage?: string;
  whatsAppStatusMessage?: string;
}

export const getSettings = async () => {
  const res = await api.get<{ data: Settings }>("/settings");
  return res.data.data;
};

export const updateSettings = async (payload: SettingsPayload) => {
  const res = await api.put<{ data: Settings }>("/settings", payload);
  return res.data.data;
};

export const uploadStoreSignature = async (file: File) => {
  const body = new FormData(); body.append("file", file);
  const res = await api.post<{ data: Settings }>("/settings/store-signature", body);
  return res.data.data;
};
