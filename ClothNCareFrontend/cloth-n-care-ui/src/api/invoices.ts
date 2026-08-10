import api from "./axios";

export interface InvoiceResponse {
  invoiceUrl: string;
}

export const generateInvoice = async (orderId: string) => {
  const res = await api.post<{ data: InvoiceResponse }>(`/invoice/${orderId}`);

  return res.data.data;
};

export const deleteInvoice = async (orderId: string) => {
  const res = await api.delete<{ data: null }>(`/invoice/${orderId}`);

  return res.data.data;
};