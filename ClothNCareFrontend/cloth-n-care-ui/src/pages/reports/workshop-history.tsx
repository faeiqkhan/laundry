import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import { downloadExport } from "../../api/dataIO";
import StatusBadge from "../../components/StatusBadge";
import type { Order, OrderItem } from "../../types/order";
import { formatDate, formatMoney, formatMoneyShort } from "../../utils/format";

interface WorkshopRow {
  key: string;
  orderId: string;
  srNo: number;
  customerName: string;
  invoiceDate: string;
  deliveryDate: string;
  invoiceNo: string;
  discount: number;
  tax: number;
  product: string;
  service: string;
  qty: number;
  uom: string;
  itemAmount: number;
  totalAmount: number | null;
  status: string;
}

function buildRows(orders: Order[]): WorkshopRow[] {
  const sorted = [...orders]
    .filter((order) => order.status !== "CANCELLED")
    .sort(
      (a, b) =>
        (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
        (a.invoiceNumber ?? "").localeCompare(b.invoiceNumber ?? ""),
    );

  const rows: WorkshopRow[] = [];
  let srNo = 1;

  for (const order of sorted) {
    const items: OrderItem[] = order.items ?? [];
    items.forEach((item, idx) => {
      const isLast = idx === items.length - 1;
      rows.push({
        key: `${order.id}::${idx}`,
        orderId: order.id,
        srNo: srNo++,
        customerName: order.customerName ?? "-",
        invoiceDate: order.createdAt ?? "",
        deliveryDate: order.expectedDeliveryDate ?? "",
        invoiceNo: order.invoiceNumber ?? order.id.slice(0, 8),
        discount: order.discount ?? 0,
        tax: order.taxAmount ?? 0,
        product: item.productName || item.productType || "-",
        service: item.serviceType ?? "-",
        qty: item.quantity ?? 0,
        uom: item.uom ?? "",
        itemAmount: item.lineTotal ?? 0,
        totalAmount: isLast ? (order.totalPrice ?? 0) : null,
        status: order.status,
      });
    });
  }

  return rows;
}

function downloadCsv(rows: WorkshopRow[]): void {
  const headers = [
    "Sr No",
    "Invoice No",
    "Customer Name",
    "Invoice Date",
    "Delivery Date",
    "Product",
    "Service",
    "Qty",
    "Item Amount",
    "Discount",
    "Tax",
    "Total Amount",
    "Status",
  ];
  const escape = (value: string): string => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.srNo,
        escape(row.invoiceNo),
        escape(row.customerName),
        escape(row.invoiceDate ? formatDate(row.invoiceDate) : ""),
        escape(row.deliveryDate ? formatDate(row.deliveryDate) : ""),
        escape(row.product),
        escape(row.service),
        `${row.qty}${row.uom ? ` ${row.uom}` : ""}`,
        formatMoney(row.itemAmount),
        formatMoney(row.discount),
        formatMoney(row.tax),
        row.totalAmount === null ? "" : formatMoney(row.totalAmount),
        escape(row.status),
      ].join(","),
    ),
  ].join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workshop-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function WorkshopHistoryReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    getOrders()
      .then((data) => {
        if (!ignore) setOrders(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const rows = useMemo<WorkshopRow[]>(() => {
    const filtered = orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) {
        return false;
      }
      const orderDate = (order.createdAt ?? "").slice(0, 10);
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    });
    return buildRows(filtered);
  }, [orders, statusFilter, dateFrom, dateTo]);

  const grandTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (row.totalAmount ?? 0), 0),
    [rows],
  );
  const invoiceCount = useMemo(
    () => new Set(rows.map((row) => row.orderId)).size,
    [rows],
  );

  if (loading) return <div className="empty-state">Loading workshop history...</div>;

  return (
    <>
      <div className="toolbar-row no-print">
        <input
          className="form-input"
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          className="form-input"
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="To date"
        />
        <select
          className="form-input filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="RECEIVED">Received</option>
          <option value="PROCESSING">Processing</option>
          <option value="WASHING">Washing</option>
          <option value="DRYING">Drying</option>
          <option value="IRONING">Ironing</option>
          <option value="FOLDED">Folded</option>
          <option value="READY">Ready</option>
          <option value="DELIVERED">Delivered</option>
        </select>
        <button
          type="button"
          className="btn"
          onClick={() => downloadCsv(rows)}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadExport("workshop", "csv")}
        >
          Export Master CSV
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          Print Challan
        </button>
      </div>

      <div className="stats-grid no-print">
        <div className="stat-card primary">
          <div className="stat-card-top">
            <span className="stat-card-label">Invoices</span>
          </div>
          <div className="stat-card-value">{invoiceCount}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-card-top">
            <span className="stat-card-label">Items</span>
          </div>
          <div className="stat-card-value">{rows.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Grand Total</span>
          </div>
          <div className="stat-card-value">{formatMoneyShort(grandTotal)}</div>
        </div>
      </div>

      <div className="print-sheet workshop-sheet">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Invoice No</th>
              <th>Customer Name</th>
              <th>Invoice Date</th>
              <th>Delivery Date</th>
              <th>Product</th>
              <th>Service</th>
              <th className="num">Qty</th>
              <th className="num">Item Amount</th>
              <th className="num">Discount</th>
              <th className="num">Tax</th>
              <th className="num">Total Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          {rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={13}>
                  <div className="table-empty">No records found</div>
                </td>
              </tr>
            </tbody>
          ) : (
            groupRowsByInvoice(rows).map((group) => (
              <tbody key={group[0].orderId}>
                {group.map((row) => (
                  <tr key={row.key}>
                    <td>{row.srNo}</td>
                    <td style={{ fontWeight: 700 }}>{row.invoiceNo}</td>
                    <td>{row.customerName}</td>
                    <td>{formatDate(row.invoiceDate)}</td>
                    <td>{formatDate(row.deliveryDate)}</td>
                    <td>{row.product}</td>
                    <td>{row.service}</td>
                    <td className="num">
                      {row.qty}
                      {row.uom ? ` ${row.uom}` : ""}
                    </td>
                    <td className="num">{formatMoney(row.itemAmount)}</td>
                    <td className="num">{formatMoney(row.discount)}</td>
                    <td className="num">{formatMoney(row.tax)}</td>
                    <td className="num">
                      {row.totalAmount === null ? (
                        ""
                      ) : (
                        <strong>{formatMoney(row.totalAmount)}</strong>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))
          )}
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={11} style={{ textAlign: "right" }}>
                  <strong>Grand Total</strong>
                </td>
                <td className="num">
                  <strong>{formatMoney(grandTotal)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

function groupRowsByInvoice(rows: WorkshopRow[]): WorkshopRow[][] {
  const groups: WorkshopRow[][] = [];
  let current: WorkshopRow[] = [];
  let lastOrderId: string | null = null;
  for (const row of rows) {
    if (lastOrderId !== null && row.orderId !== lastOrderId) {
      groups.push(current);
      current = [];
    }
    current.push(row);
    lastOrderId = row.orderId;
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups;
}