export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER";

export interface OrderItem {
  id: string;
  serviceType: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  recordedByName?: string;
}

export interface Order {
  id: string;
  status: string;
  totalPrice: number;
  discount: number;
  taxAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  invoiceNumber?: string;
  expectedDeliveryDate: string;
  createdAt: string;
  invoiceUrl: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  createdByName?: string;
  items?: OrderItem[];
  payments?: Payment[];
}

export const ORDER_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "WASHING",
  "DRYING",
  "IRONING",
  "FOLDED",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};
