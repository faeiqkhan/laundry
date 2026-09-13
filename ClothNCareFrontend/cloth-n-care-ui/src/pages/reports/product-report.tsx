import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import ReportTable, { type Column } from "../../components/ReportTable";
import type { Order } from "../../types/order";
import { formatMoney, formatMoneyShort } from "../../utils/format";

interface ProductRow {
  key: string;
  productType: string;
  serviceType: string;
  quantity: number;
  sales: number;
  invoices: number;
}

export default function ProductReport() {
  const [orders, setOrders] = useState<Order[]>([]);
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

  const rows = useMemo<ProductRow[]>(() => {
    const byKey = new Map<string, ProductRow>();

    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      for (const item of order.items ?? []) {
        const key = `${item.productType}::${item.serviceType}`;
        const row =
          byKey.get(key) ??
          ({
            key,
            productType: item.productType,
            serviceType: item.serviceType,
            quantity: 0,
            sales: 0,
            invoices: 0,
          } satisfies ProductRow);
        row.quantity += item.quantity;
        row.sales += item.lineTotal;
        row.invoices += 1;
        byKey.set(key, row);
      }
    }

    return Array.from(byKey.values()).sort((a, b) => b.sales - a.sales);
  }, [orders]);

  const totals = useMemo(
    () => rows.reduce((acc, row) => acc + row.sales, 0),
    [rows],
  );

  const columns: Column<ProductRow>[] = [
    { key: "product", header: "Product", render: (row) => <strong>{row.productType}</strong> },
    { key: "service", header: "Service", className: "cell-muted", render: (row) => row.serviceType },
    { key: "qty", header: "Quantity", align: "right", render: (row) => row.quantity },
    { key: "invoices", header: "Invoices", align: "right", render: (row) => row.invoices },
    {
      key: "sales",
      header: "Amount",
      align: "right",
      render: (row) => <strong>{formatMoney(row.sales)}</strong>,
    },
  ];

  if (loading) return <div className="empty-state">Loading product report...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-top">
            <span className="stat-card-label">Products</span>
          </div>
          <div className="stat-card-value">{rows.length}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Value</span>
          </div>
          <div className="stat-card-value">{formatMoneyShort(totals)}</div>
        </div>
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        empty="No product sales found"
      />
    </>
  );
}