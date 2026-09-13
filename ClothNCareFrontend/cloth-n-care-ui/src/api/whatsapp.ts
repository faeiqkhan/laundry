import api from "./axios";

export interface WhatsAppMessage {
  id: string;
  toPhone: string;
  category: string;
  status: string;
  body: string;
  templateName?: string;
  businessKey?: string;
  messageType?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  invoiceId?: string;
  provider?: string;
  providerMessageId?: string;
  failureReason?: string;
  attemptCount?: number;
  sentAt: string;
}

export interface WhatsAppMessageFilter {
  phone?: string;
  status?: string;
  messageType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface WhatsAppConnectionStatus {
  provider: string;
  state:
    | "NOT_CONFIGURED"
    | "CONNECTING"
    | "QR_REQUIRED"
    | "CONNECTED"
    | "DISCONNECTED"
    | "AUTH_FAILURE"
    | "LOGGED_OUT"
    | "OFFLINE"
    | "ERROR";
  connected: boolean;
  configured: boolean;
  qrDataUrl?: string;
  businessNumber?: string;
  lastConnectedAt?: string;
  message?: string;
}

export interface WhatsAppDeliveryResult {
  success: boolean;
  message: string;
  status: string;
  providerMessageId?: string;
  provider?: string;
  retryable: boolean;
  orderId?: string;
  invoiceId?: string;
}

export const getWhatsAppMessages = async (filter: WhatsAppMessageFilter = {}) => {
  const params = new URLSearchParams();
  if (filter.phone) params.set("phone", filter.phone);
  if (filter.status) params.set("status", filter.status);
  if (filter.messageType) params.set("messageType", filter.messageType);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.limit) params.set("limit", String(filter.limit));

  const res = await api.get<{ data: WhatsAppMessage[] }>(
    `/whatsapp/messages${params.toString() ? `?${params.toString()}` : ""}`,
  );
  return res.data.data;
};

export const getWhatsAppConnectionStatus = async () => {
  const res = await api.get<{ data: WhatsAppConnectionStatus }>("/whatsapp/connection/status");
  return res.data.data;
};

export const connectWhatsApp = async () => {
  const res = await api.post<{ data: WhatsAppConnectionStatus }>("/whatsapp/connection/connect");
  return res.data.data;
};

export const reconnectWhatsApp = async () => {
  const res = await api.post<{ data: WhatsAppConnectionStatus }>("/whatsapp/connection/reconnect");
  return res.data.data;
};

export const logoutWhatsApp = async () => {
  const res = await api.post<{ data: WhatsAppConnectionStatus }>("/whatsapp/connection/logout");
  return res.data.data;
};

export const sendWhatsAppMessage = async (to: string, body: string) => {
  const res = await api.post<{ data: WhatsAppDeliveryResult }>("/whatsapp/send", { to, body });
  return res.data.data;
};

export const retryWhatsAppMessage = async (id: string) => {
  const res = await api.post<{ data: WhatsAppMessage }>(`/whatsapp/messages/${id}/retry`);
  return res.data.data;
};

export const sendInvoiceOnWhatsApp = async (orderId: string) => {
  const res = await api.post<{ data: WhatsAppDeliveryResult }>(`/whatsapp/invoice/${orderId}`);
  return res.data.data;
};