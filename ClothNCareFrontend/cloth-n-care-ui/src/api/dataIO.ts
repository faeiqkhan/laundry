import api from "./axios";

export type DataResource =
  | "customers"
  | "price-lists"
  | "products"
  | "services"
  | "orders"
  | "payments"
  | "expenses"
  | "expense-heads"
  | "bags"
  | "racks"
  | "charge-types"
  | "users"
  | "invoices";

export type DataFormat = "xlsx" | "csv";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const fileNames: Record<DataResource, string> = {
  customers: "customers",
  "price-lists": "price-lists",
  products: "products",
  services: "services",
  orders: "orders",
  payments: "payments",
  expenses: "expenses",
  "expense-heads": "expense-heads",
  bags: "bags",
  racks: "racks",
  "charge-types": "charge-types",
  users: "users",
  invoices: "invoices",
};

const dateStamp = (): string => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadExport = async (
  resource: DataResource,
  format: DataFormat = "xlsx",
): Promise<void> => {
  const res = await api.get<Blob>(`/data-io/export/${resource}`, {
    params: { format },
    responseType: "blob",
  });
  saveBlob(res.data, `${fileNames[resource]}-${dateStamp()}.${format}`);
};

export const downloadTemplate = async (
  resource: DataResource,
  format: DataFormat = "xlsx",
): Promise<void> => {
  const res = await api.get<Blob>(`/data-io/template/${resource}`, {
    params: { format },
    responseType: "blob",
  });
  saveBlob(res.data, `${fileNames[resource]}-template.${format}`);
};

export const importData = async (
  resource: DataResource,
  file: File,
  format: DataFormat,
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<{ data: ImportResult }>(
    `/data-io/import/${resource}`,
    formData,
    { params: { format } },
  );
  return res.data.data;
};