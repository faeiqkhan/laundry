import { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrderStatus } from "../api/orders";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import StatusBadge from "../components/StatusBadge";
import type { Order } from "../types/order";
import { formatMoney, formatDate, todayISO } from "../utils/format";

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  const fetchOrders = async () => {
    const data = await getOrders();
    setOrders(data);
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

  const deliveries = useMemo(() => {
    const today = todayISO();
    return orders
      .filter(
        (order) =>
          order.status !== "DELIVERED" && order.status !== "CANCELLED",
      )
      .filter((order) => order.expectedDeliveryDate)
      .sort((a, b) =>
        a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate),
      )
      .map((order) => ({
        order,
        overdue: order.expectedDeliveryDate < today,
        dueToday: order.expectedDeliveryDate === today,
      }));
  }, [orders]);

  const deliveredCount = orders.filter(
    (order) => order.status === "DELIVERED",
  ).length;
  const overdueCount = deliveries.filter((entry) => entry.overdue).length;

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading deliveries...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Delivery Orders</h1>
          <p>
            {deliveries.length} pending · {overdueCount} overdue ·{" "}
            {deliveredCount} delivered
          </p>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Expected Delivery</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty">
                    <Icon name="clock" size={32} className="table-empty-icon" />
                    <div>No pending deliveries</div>
                  </div>
                </td>
              </tr>
            ) : (
              deliveries.map(({ order, overdue, dueToday }) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700 }}>
                    {order.invoiceNumber ?? order.id.slice(0, 8)}
                  </td>
                  <td>{order.customerName ?? "-"}</td>
                  <td className="cell-muted">{order.customerPhone ?? "-"}</td>
                  <td>
                    <span
                      className={
                        overdue
                          ? "amount-due"
                          : dueToday
                            ? "badge badge-warning"
                            : "cell-muted"
                      }
                    >
                      {formatDate(order.expectedDeliveryDate)}
                      {overdue && " · overdue"}
                      {dueToday && " · today"}
                    </span>
                  </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
