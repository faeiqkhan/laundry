import api from "./axios";

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  active: boolean;
}

export interface ProductPayload {
  name: string;
  unit?: string;
  price?: number;
  active?: boolean;
}

export const getProducts = async () => {
  const res = await api.get<{ data: Product[] }>("/products");
  return res.data.data;
};

export const createProduct = async (payload: ProductPayload) => {
  const res = await api.post<{ data: Product }>("/products", payload);
  return res.data.data;
};

export const updateProduct = async (id: string, payload: ProductPayload) => {
  const res = await api.put<{ data: Product }>(`/products/${id}`, payload);
  return res.data.data;
};

export const deleteProduct = async (id: string) => {
  await api.delete(`/products/${id}`);
};
