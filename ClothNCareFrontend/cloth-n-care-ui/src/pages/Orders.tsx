import { useEffect, useState } from "react";
import CreateOrderModal from "../components/CreateOrderModal";
import { getOrders, updateOrderStatus } from "../api/orders";
import { generateInvoice } from "../api/invoices";
import DashboardLayout from "../layout/DashboardLayout";
import type { Order } from "../types/order";

const statusOptions = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];
const backendBaseUrl = `${window.location.protocol}//${window.location.hostname}:8080`;

const generateInvoiceForOrder = async (orderId: string) => {
  try {
    const result = await generateInvoice(orderId);
    return result.invoiceUrl;
  } catch (err) {
    console.error(err);
    alert("Failed to generate invoice");
    return null;
  }
};

const getStatusClassName = (status: string) => {
  switch (status) {
    case "RECEIVED":
      return "status-badge status-received";
    case "PROCESSING":
      return "status-badge status-processing";
    case "READY":
      return "status-badge status-ready";
    case "DELIVERED":
      return "status-badge status-delivered";
    default:
      return "status-badge status-default";
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    getOrders()
      .then((data) => {
        if (!ignore) {
          setOrders(data);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const getInvoiceUrl = (invoiceUrl?: string) => {
    if (!invoiceUrl) {
      return "";
    }
    return `${backendBaseUrl}${invoiceUrl}`;
  };

  const handleDownloadInvoice = (invoiceUrl?: string) => {
    const fullUrl = getInvoiceUrl(invoiceUrl);
    if (!fullUrl) {
      alert("Invoice not available");
      return;
    }
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendWhatsApp = (order: Order) => {
    const customerPhone = order.customerPhone?.replace(/\D/g, "");

    if (!customerPhone) {
      alert("Customer phone is missing");
      return;
    }

    const invoiceLines = [
      `Hi ${order.customerName ?? "there"},`,
      "",
      `Your Cloth n Care invoice is ready.`,
      `Order ID: ${order.id}`,
      `Status: ${order.status}`,
      `Total: ₹${order.totalPrice ?? 0}`,
      `Delivery Date: ${order.expectedDeliveryDate ?? "-"}`,
      "",
      "Please check your invoice details and contact us if anything looks wrong.",
    ];

    if (!order.invoiceUrl) {
      alert("Invoice is missing");
      return;
    }

    const message = encodeURIComponent(invoiceLines.join("\n"));
    window.open(
      `https://wa.me/${customerPhone}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handlePrintInvoice = (invoiceUrl?: string) => {
    const fullUrl = getInvoiceUrl(invoiceUrl);
    if (!fullUrl) {
      alert("Invoice not available");
      return;
    }

    const printWindow = window.open(fullUrl, "_blank");
    if (!printWindow) {
      alert("Unable to open invoice window for printing");
      return;
    }

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handlePrintTag = (order: Order) => {
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
            <div class="row"><span class="label">Customer Phone</span><span class="value">${order.customerPhone ?? "-"}</span></div>
            <div class="row"><span class="label">Customer</span><span class="value">${order.customerName ?? "-"}</span></div>
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

  if (loading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="primary-button"
        >
          + Create Order
        </button>
      </div>

      <div className="table-card premium-table-card">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Created By</th>
              <th>Total</th>
              <th>Delivery Date</th>
              <th>Invoice</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td data-label="Order ID">{order.id}</td>

                <td data-label="Status">
                  <span className={getStatusClassName(order.status)}>
                    {order.status}
                  </span>
                </td>

                <td data-label="Customer">{order.customerName ?? "-"}</td>

                <td data-label="Created By">{order.createdByName ?? "-"}</td>

                <td data-label="Total">{"\u20b9"}{order.totalPrice ?? 0}</td>

                <td data-label="Delivery Date">{order.expectedDeliveryDate ?? "-"}</td>

                <td data-label="Invoice">
                  {order.invoiceUrl ? (
                    <button
                      type="button"
                      className="order-action-link"
                      onClick={() => handleDownloadInvoice(order.invoiceUrl)}
                    >
                      Download
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-text-button action-blue"
                      onClick={async () => {
                        const url = await generateInvoiceForOrder(order.id);
                        if (url) {
                          fetchOrders();
                        }
                      }}
                    >
                      Generate
                    </button>
                  )}
                </td>

                <td data-label="Actions">
                  <div className="order-actions-wrap">
                    <select
                      className="status-select"
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(order.id, event.target.value)
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>

                    <div className="order-inline-actions">
                      <button
                        type="button"
                        className="icon-text-button action-blue"
                        onClick={() => handleDownloadInvoice(order.invoiceUrl)}
                      >
                        Invoice
                      </button>

                      <button
                        type="button"
                        className="icon-text-button action-green"
                        onClick={() => handleSendWhatsApp(order)}
                      >
                        WhatsApp
                      </button>

                      <button
                        type="button"
                        className="icon-text-button action-purple"
                        onClick={() => handlePrintInvoice(order.invoiceUrl)}
                      >
                        Print Invoice
                      </button>

                      <button
                        type="button"
                        className="icon-text-button action-dark"
                        onClick={() => handlePrintTag(order)}
                      >
                        Print Tag
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateOrderModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchOrders}
        />
      )}
    </DashboardLayout>
  );
}
