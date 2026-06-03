import api from "./axios";

export interface InvoiceResponse {
  invoiceUrl: string;
}

export const generateInvoice = async (orderId: string) => {
  const res = await api.post<{ data: InvoiceResponse }>(`/api/invoice/${orderId}`);

  return res.data.data;
};