import { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrderStatus } from "../api/orders";
import DashboardLayout from "../layout/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import type { Order } from "../types/order";
import { formatMoney, todayISO } from "../utils/format";

export default function TodayDeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  const fetchOrders = async () => {
    setOrders(await getOrders());
  };

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

  const today = todayISO();

  const dueToday = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.status !== "DELIVERED" &&
            order.status !== "CANCELLED" &&
            order.expectedDeliveryDate === today,
        )
        .sort((a, b) => (a.customerName ?? "").localeCompare(b.customerName ?? "")),
    [orders, today],
  );

  const deliveredToday = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "DELIVERED" && order.expectedDeliveryDate === today,
      ),
    [orders, today],
  );

  const handleDeliver = async (order: Order) => {
    if (
      !window.confirm(
        `Mark ${order.invoiceNumber ?? order.id.slice(0, 8)} as DELIVERED?`,
      )
    ) {
      return;
    }
    try {
      setWorking(order.id);
      await updateOrderStatus(order.id, "DELIVERED");
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to update delivery status");
    } finally {
      setWorking("");
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Today&apos;s Delivery</h1>
          <p>
            {dueToday.length} due today · {deliveredToday.length} already delivered
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading today&apos;s deliveries...</div>
      ) : dueToday.length === 0 ? (
        <div className="empty-state">No deliveries scheduled for today</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dueToday.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700 }}>
                    {order.invoiceNumber ?? order.id.slice(0, 8)}
                  </td>
                  <td>{order.customerName ?? "-"}</td>
                  <td className="cell-muted">{order.customerPhone ?? "-"}</td>
                  <td className="cell-total">{formatMoney(order.totalPrice)}</td>
                  <td>
                    <StatusBadge status={order.paymentStatus} />
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={working === order.id}
                      onClick={() => handleDeliver(order)}
                    >
                      {working === order.id ? "..." : "Mark Delivered"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deliveredToday.length > 0 && (
        <div className="table-card">
          <div className="card-title-row">
            <h3>Delivered today</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {deliveredToday.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700 }}>
                    {order.invoiceNumber ?? order.id.slice(0, 8)}
                  </td>
                  <td>{order.customerName ?? "-"}</td>
                  <td className="cell-total">{formatMoney(order.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}