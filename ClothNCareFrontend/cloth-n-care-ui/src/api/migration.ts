import api from "./axios";

export interface MigrationSourceFiles {
  bookedLaundry?: string;
  invoices?: string;
  orderDetails?: string;
  expenses?: string;
  payments?: string;
}

export interface MigrationCounts {
  bookedLaundryRows: number;
  invoicesFound: number;
  uniqueOrderNumbers: number;
  orderDetailRows: number;
  uniqueCustomers: number;
  expensesFound: number;
  paymentsFound: number;
  paymentsMatched: number;
  paymentsUnmatched: number;
}

export interface MigrationReconciliation {
  matched: number;
  bookedOnly: number;
  bookedOnlyInactive: number;
  invoiceOnly: number;
  detailOnly: number;
  ordersWithDetails: number;
  ordersWithoutDetails: number;
}

export interface MigrationCustomerGroup {
  normalizedPhone: string;
  displayPhone: string;
  names: string[];
  sourceRecords: number;
}

export interface MigrationLineIssue {
  orderNo?: string;
  productName?: string;
  service?: string;
  quantity?: number;
  price?: number;
  sourceTotal?: number;
  message: string;
}

export interface MigrationTotalMismatch {
  orderNo: string;
  itemsTotal: number;
  discount: number;
  additionalCharges: number;
  expectedTotal: number;
  sourceTotal: number;
}

export interface MigrationUnmatchedProduct {
  productName: string;
  service: string;
  lineCount: number;
}

export interface MigrationStatusMapping {
  source: string;
  target: string;
  rows: number;
  note?: string;
}

export interface DryRunReport {
  generatedAt: string;
  sourceFiles: MigrationSourceFiles;
  counts: MigrationCounts;
  reconciliation: MigrationReconciliation;
  duplicateInvoiceCount: number;
  duplicateInvoiceNumbers: string[];
  duplicateCustomerCount: number;
  duplicateCustomers: MigrationCustomerGroup[];
  missingPhoneNumbers: number;
  invalidDates: number;
  invalidNumberCount: number;
  unknownStatuses: string[];
  unknownServices: string[];
  invalidQuantities: MigrationLineIssue[];
  invalidPrices: MigrationLineIssue[];
  lineTotalMismatches: MigrationLineIssue[];
  invoiceTotalMismatches: MigrationTotalMismatch[];
  orphanDetails: string[];
  paymentMemos: string[];
  unmatchedProducts: MigrationUnmatchedProduct[];
  invoiceNumberMin: number;
  invoiceNumberMax: number;
  recommendedInvoiceCounter: number;
  statusMappings: MigrationStatusMapping[];
  warnings: string[];
  errors: string[];
}

export interface ExecutionResult {
  completedAt: string;
  customersCreated: number;
  customersMatched: number;
  ordersCreated: number;
  ordersSkipped: number;
  orderItemsCreated: number;
  expensesCreated: number;
  expensesSkipped: number;
  paymentsCreated: number;
  paymentsSkipped: number;
  paymentsUnmatched: number;
  orphanDetailsSkipped: number;
  invoiceCounterUpdatedTo: number;
  warnings: string[];
  errors: string[];
}

export interface MigrationStatus {
  invoicesImported: number;
  customersImported: number;
  expensesImported: number;
  paymentsImported: number;
  totalLedgerEntries: number;
}

export const getMigrationStatus = async (): Promise<MigrationStatus> => {
  const res = await api.get<{ data: MigrationStatus }>("/migration/status");
  return res.data.data;
};

export const dryRunLocal = async (): Promise<DryRunReport> => {
  const res = await api.post<{ data: DryRunReport }>("/migration/dry-run/local");
  return res.data.data;
};

export const dryRunWithFiles = async (files: {
  booked?: File;
  invoices?: File;
  orderDetails?: File;
  expenses?: File;
  payments?: File;
}): Promise<DryRunReport> => {
  const formData = new FormData();
  if (files.booked) formData.append("booked", files.booked);
  if (files.invoices) formData.append("invoices", files.invoices);
  if (files.orderDetails) formData.append("orderDetails", files.orderDetails);
  if (files.expenses) formData.append("expenses", files.expenses);
  if (files.payments) formData.append("payments", files.payments);
  const res = await api.post<{ data: DryRunReport }>("/migration/dry-run", formData);
  return res.data.data;
};

export const executeLocal = async (): Promise<ExecutionResult> => {
  const res = await api.post<{ data: ExecutionResult }>("/migration/execute/local");
  return res.data.data;
};

export const executeWithFiles = async (files: {
  booked?: File;
  invoices?: File;
  orderDetails?: File;
  expenses?: File;
  payments?: File;
}): Promise<ExecutionResult> => {
  const formData = new FormData();
  if (files.booked) formData.append("booked", files.booked);
  if (files.invoices) formData.append("invoices", files.invoices);
  if (files.orderDetails) formData.append("orderDetails", files.orderDetails);
  if (files.expenses) formData.append("expenses", files.expenses);
  if (files.payments) formData.append("payments", files.payments);
  const res = await api.post<{ data: ExecutionResult }>("/migration/execute", formData);
  return res.data.data;
};