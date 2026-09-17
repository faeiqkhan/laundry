import { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrderStatus } from "../api/orders";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import StatusBadge from "../components/StatusBadge";
import { ORDER_STATUSES, type Order } from "../types/order";
import { formatMoney, formatDate, todayISO } from "../utils/format";

const deliveryStatuses = ORDER_STATUSES.filter(
  (status) => status !== "DELIVERED" && status !== "CANCELLED",
);

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [deliveryFilter, setDeliveryFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    const term = search.trim().toLowerCase();

    return orders
      .filter(
        (order) =>
          order.status !== "DELIVERED" && order.status !== "CANCELLED",
      )
      .filter((order) => order.expectedDeliveryDate)
      .filter((order) => {
        if (statusFilter !== "ALL" && order.status !== statusFilter) {
          return false;
        }
        if (paymentFilter !== "ALL" && order.paymentStatus !== paymentFilter) {
          return false;
        }
        if (dateFrom && order.expectedDeliveryDate < dateFrom) return false;
        if (dateTo && order.expectedDeliveryDate > dateTo) return false;
        if (term) {
          const searchable = [
            order.invoiceNumber,
            order.customerName,
            order.customerPhone,
            order.id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!searchable.includes(term)) return false;
        }

        const overdue = order.expectedDeliveryDate < today;
        const dueToday = order.expectedDeliveryDate === today;
        if (deliveryFilter === "OVERDUE" && !overdue) return false;
        if (deliveryFilter === "TODAY" && !dueToday) return false;
        if (deliveryFilter === "UPCOMING" && (overdue || dueToday)) return false;
        return true;
      })
      .sort((a, b) =>
        a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate),
      )
      .map((order) => ({
        order,
        overdue: order.expectedDeliveryDate < today,
        dueToday: order.expectedDeliveryDate === today,
      }));
  }, [orders, search, statusFilter, paymentFilter, deliveryFilter, dateFrom, dateTo]);

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

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search invoice, customer, phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search delivery orders"
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by order status"
        >
          <option value="ALL">All statuses</option>
          {deliveryStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
          aria-label="Filter by payment status"
        >
          <option value="ALL">All payments</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </select>

        <select
          className="filter-select"
          value={deliveryFilter}
          onChange={(event) => setDeliveryFilter(event.target.value)}
          aria-label="Filter by delivery timing"
        >
          <option value="ALL">All delivery dates</option>
          <option value="OVERDUE">Overdue</option>
          <option value="TODAY">Due today</option>
          <option value="UPCOMING">Upcoming</option>
        </select>

        <input
          className="form-input"
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="Delivery date from"
        />
        <input
          className="form-input"
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="Delivery date to"
        />

        {(search || statusFilter !== "ALL" || paymentFilter !== "ALL" ||
          deliveryFilter !== "ALL" || dateFrom || dateTo) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setPaymentFilter("ALL");
              setDeliveryFilter("ALL");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear filters
          </button>
        )}
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
