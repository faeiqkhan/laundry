export interface OrderItem {
  id: string;
  serviceType: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: string;
  totalPrice: number;
  expectedDeliveryDate: string;
  invoiceUrl: string;
  customerName?: string;
  customerPhone?: string;
  createdByName?: string;
  items?: OrderItem[];
}
