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
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  createdByName?: string;
  expectedDeliveryDate?: string;
  items?: { id: string; serviceType: string; productType: string }[];
}) => {
  const printWindow = window.open("", "_blank", "width=460,height=680");
  if (!printWindow) {
    alert("Unable to open print window");
    return;
  }

  const invoiceNo = order.invoiceNumber || order.id.slice(0, 6);
  const customer = order.customerName || order.customerPhone || "-";
  const delivery = formatTagDate(order.expectedDeliveryDate);

  const rows =
    order.items && order.items.length > 0
      ? order.items.map((item, index) => ({
          service: item.serviceType,
          garment: item.productType,
          count: `${index + 1} / ${order.items!.length}`,
        }))
      : [{ service: "Dry Cleaning", garment: "Garment", count: "1 / 1" }];

  const tagsHtml = rows
    .map(
      (row) => `
        <div class="tag">
          <div class="brand">Cloth &amp; Care</div>
          <div class="service">${escapeHtml(row.service)}</div>
          <div class="garment">${escapeHtml(row.garment)}</div>
          <div class="invoice">${escapeHtml(invoiceNo)}</div>
          <div class="customer">${escapeHtml(customer)}</div>
          <div class="delivery">${escapeHtml(delivery || "Delivery date")}</div>
          <div class="count">${escapeHtml(row.count)}</div>
        </div>`,
    )
    .join("");

  const tagMarkup = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Garment Tags - ${order.id}</title>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #ffffff; }
          body { font-family: Arial, Helvetica, sans-serif; color: #000000; }
          .tags { display: flex; flex-direction: column; align-items: stretch; }
          .tag {
            width: 40mm;
            height: 70mm;
            padding: 2mm 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-evenly;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
            break-after: page;
          }
          .tag:last-child { page-break-after: auto; break-after: auto; }
          .brand { font-size: 15px; font-weight: 800; letter-spacing: 0.4px; white-space: nowrap; }
          .service { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; }
          .garment { font-size: 13px; font-weight: 700; }
          .invoice { font-size: 26px; font-weight: 800; letter-spacing: 0.6px; line-height: 1.05; }
          .customer { font-size: 11px; font-weight: 700; }
          .delivery { font-size: 10px; font-weight: 700; }
          .count { font-size: 12px; font-weight: 800; }
          @page { size: 40mm 70mm; margin: 0; }
        </style>
      </head>
      <body>
        <div class="tags">${tagsHtml}</div>
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

const formatTagDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
