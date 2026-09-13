import api from "./axios";

export interface WhatsAppMessage {
  id: string;
  toPhone: string;
  category: string;
  status: string;
  body: string;
  templateName?: string;
  sentAt: string;
}

export const getWhatsAppMessages = async (phone?: string) => {
  const params = new URLSearchParams();
  if (phone) params.set("phone", phone);

  const res = await api.get<{ data: WhatsAppMessage[] }>(
    `/whatsapp/messages${params.toString() ? `?${params.toString()}` : ""}`,
  );
  return res.data.data;
};