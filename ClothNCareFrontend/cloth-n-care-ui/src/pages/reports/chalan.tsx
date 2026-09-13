import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../../api/orders";
import { getSettings } from "../../api/settings";
import StatusBadge from "../../components/StatusBadge";
import type { Order } from "../../types/order";
import { formatDate, formatMoney } from "../../utils/format";

export default function ChalanReport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [businessName, setBusinessName] = useState("ClothNCare");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    let ignore = false;

    Promise.all([getOrders(), getSettings()])
      .then(([orderData, settings]) => {
        if (!ignore) {
          setOrders(orderData);
          setBusinessName(settings.businessName || "ClothNCare");
          setAddress(settings.address || "");
          setPhone(settings.phone || "");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return orders.filter(
      (order) =>
        (order.invoiceNumber ?? "").toLowerCase().includes(term) ||
        (order.customerName ?? "").toLowerCase().includes(term) ||
        (order.customerPhone ?? "").toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term),
    );
  }, [orders, query]);

  const pickOrder = (order: Order) => {
    setSelected(order);
    setQuery(order.invoiceNumber ?? order.id.slice(0, 8));
  };

  if (loading) return <div className="empty-state">Loading orders...</div>;

  return (
    <>
      <div className="toolbar-row">
        <input
          className="form-input"
          placeholder="Search by invoice, customer, or phone..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
        />
      </div>

      {!selected && matches.length > 0 && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => pickOrder(order)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontWeight: 700 }}>
                    {order.invoiceNumber ?? order.id.slice(0, 8)}
                  </td>
                  <td>{order.customerName ?? "-"}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selected && matches.length === 0 && (
        <div className="empty-state">Search and select an order to generate its chalan</div>
      )}

      {selected && (
        <div className="print-sheet no-chrome">
          <div className="toolbar-row no-print">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              Print Chalan
            </button>
          </div>

          <div className="sheet-meta">CHALAN / DELIVERY NOTE</div>
          <h2>{businessName}</h2>
          <div className="sheet-meta">
            {address}
            {phone && (
              <div>
                Phone: {phone}
              </div>
            )}
          </div>

          <div className="sheet-meta" style={{ marginTop: 12 }}>
            <div>
              Chalan Date: {formatDate(new Date().toISOString())} · Order Date:{" "}
              {formatDate(selected.createdAt?.split("T")[0] ?? "")} · Delivery:{" "}
              {formatDate(selected.expectedDeliveryDate)}
            </div>
            <div>
              Invoice: <strong>{selected.invoiceNumber ?? "-"}</strong> · Order:{" "}
              {selected.id}
            </div>
            <div>
              Customer: <strong>{selected.customerName ?? "-"}</strong>
              {selected.customerPhone ? ` · ${selected.customerPhone}` : ""}
            </div>
          </div>

          <ul className="items-list">
            {selected.items?.map((item) => (
              <li key={item.id}>
                <span>
                  {item.productType} — {item.serviceType} (×{item.quantity})
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Total</span>
              <strong>{formatMoney(selected.totalPrice)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Discount</span>
              <span>-{formatMoney(selected.discount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tax</span>
              <span>{formatMoney(selected.taxAmount)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #e2e8f0",
                paddingTop: 8,
                marginTop: 8,
              }}
            >
              <span>Balance Due</span>
              <strong>{formatMoney(selected.balanceDue)}</strong>
            </div>
          </div>

          <div className="sheet-meta" style={{ marginTop: 16 }}>
            Customer signature: ________________________
          </div>
        </div>
      )}
    </>
  );
}