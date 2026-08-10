import { generateInvoice } from "../api/invoices";

const isDev = window.location.port === "5173";
const backendBaseUrl = isDev
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : "";

export const getInvoiceUrl = (invoiceUrl?: string): string =>
  invoiceUrl ? `${backendBaseUrl}${invoiceUrl}` : "";

const fetchInvoiceBlob = async (url: string): Promise<Blob> => {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to download invoice file");
  }
  return response.blob();
};

export const downloadInvoice = async (invoiceUrl?: string): Promise<void> => {
  const fullUrl = getInvoiceUrl(invoiceUrl);
  if (!fullUrl) {
    alert("Invoice not available");
    return;
  }
  try {
    const blob = await fetchInvoiceBlob(fullUrl);
    const blobUrl = URL.createObjectURL(blob);
    const fileName = invoiceUrl?.split("/").pop() ?? "invoice.pdf";
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error(err);
    alert("Failed to download invoice");
  }
};

export const printInvoice = async (invoiceUrl?: string): Promise<void> => {
  const fullUrl = getInvoiceUrl(invoiceUrl);
  if (!fullUrl) {
    alert("Invoice not available");
    return;
  }
  try {
    const blob = await fetchInvoiceBlob(fullUrl);
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, "_blank");
    if (!printWindow) {
      alert("Unable to open invoice window for printing");
      return;
    }
    printWindow.onload = () => {
      printWindow.print();
    };
  } catch (err) {
    console.error(err);
    alert("Failed to open invoice for printing");
  }
};

export const ensureInvoice = async (orderId: string): Promise<string | null> => {
  try {
    const result = await generateInvoice(orderId);
    return result.invoiceUrl;
  } catch (err) {
    console.error(err);
    alert("Failed to generate invoice");
    return null;
  }
};

export const printOrderTag = (order: {
  id: string;
  customerName?: string;
  customerPhone?: string;
  createdByName?: string;
  expectedDeliveryDate?: string;
  totalPrice?: number;
  status?: string;
}) => {
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) {
    alert("Unable to open print window");
    return;
  }

  const printDate = new Date().toLocaleString();
  const tagMarkup = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Order Tag - ${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111827; }
          .tag { border: 2px dashed #111827; border-radius: 12px; padding: 16px; }
          .brand { font-size: 18px; font-weight: 800; margin: 0 0 4px 0; letter-spacing: 0.4px; }
          .muted { color: #4b5563; font-size: 12px; margin-bottom: 12px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { color: #374151; }
          .value { font-weight: 700; text-align: right; margin-left: 12px; }
          .status { margin-top: 8px; display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-weight: 700; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="tag">
          <p class="brand">ClothNCare</p>
          <p class="muted">Laundry Tag • ${printDate}</p>
          <div class="row"><span class="label">Order ID</span><span class="value">${order.id}</span></div>
          <div class="row"><span class="label">Customer</span><span class="value">${order.customerName ?? "-"}</span></div>
          <div class="row"><span class="label">Customer Phone</span><span class="value">${order.customerPhone ?? "-"}</span></div>
          <div class="row"><span class="label">Created By</span><span class="value">${order.createdByName ?? "-"}</span></div>
          <div class="row"><span class="label">Delivery Date</span><span class="value">${order.expectedDeliveryDate ?? "-"}</span></div>
          <div class="row"><span class="label">Total</span><span class="value">₹${order.totalPrice ?? 0}</span></div>
          <span class="status">${order.status}</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 200);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(tagMarkup);
  printWindow.document.close();
};
