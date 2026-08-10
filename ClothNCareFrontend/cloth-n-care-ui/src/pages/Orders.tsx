import { useEffect, useMemo, useState } from "react";
import CreateOrderModal from "../components/CreateOrderModal";
import OrderDetailDrawer from "../components/OrderDetailDrawer";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icons";
import { getOrders, deleteOrder } from "../api/orders";
import { printOrderTag, downloadInvoice } from "../utils/invoice";
import DashboardLayout from "../layout/DashboardLayout";
import type { Order } from "../types/order";
import { ORDER_STATUSES } from "../types/order";
import { formatMoney, formatDate } from "../utils/format";
import { canManage } from "../utils/auth";

const statusFilters = ["ALL", ...ORDER_STATUSES];
const paymentFilters = ["ALL", "PAID", "PARTIAL", "UNPAID"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
      setSelected((current) =>
        current ? data.find((order) => order.id === current.id) ?? null : null,
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (order: Order) => {
    if (!window.confirm(`Delete order ${order.invoiceNumber ?? order.id.slice(0, 8)}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteOrder(order.id);
      if (selected?.id === order.id) setSelected(null);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete order");
    }
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (paymentFilter !== "ALL" && order.paymentStatus !== paymentFilter) {
        return false;
      }
      if (!term) return true;
      return (
        order.customerName?.toLowerCase().includes(term) ||
        order.customerPhone?.toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term) ||
        (order.invoiceNumber ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const counts = useMemo(() => {
    const active = orders.filter(
      (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
    ).length;
    const due = orders.filter(
      (order) =>
        order.balanceDue > 0 && order.status !== "CANCELLED",
    ).length;
    return { active, due };
  }, [orders]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading orders...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Orders</h1>
          <p>
            {orders.length} total · {counts.active} active · {counts.due}{" "}
            with outstanding balance
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Icon name="plus" size={16} />
            Create Order
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search by customer, phone, or order id"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All statuses" : status}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
          aria-label="Filter by payment"
        >
          {paymentFilters.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All payments" : status}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Delivery</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    <Icon name="orders" size={32} className="table-empty-icon" />
                    <div>No orders found</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelected(order)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="money">{order.invoiceNumber ?? order.id.slice(0, 8)}</div>
                    <div className="muted">{order.id.slice(0, 8)}</div>
                  </td>

                  <td>
                    <StatusBadge status={order.status} />
                  </td>

                  <td>
                    {order.customerName ?? "-"}
                    {order.customerPhone && (
                      <div className="muted">{order.customerPhone}</div>
                    )}
                  </td>

                  <td>
                    <span className="money">{formatMoney(order.totalPrice)}</span>
                    {order.balanceDue > 0 && (
                      <div className="muted amount-due">
                        due {formatMoney(order.balanceDue)}
                      </div>
                    )}
                  </td>

                  <td>
                    <StatusBadge status={order.paymentStatus} />
                  </td>

                  <td className="cell-muted">
                    {formatDate(order.expectedDeliveryDate)}
                  </td>

                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="View details"
                        onClick={() => setSelected(order)}
                      >
                        <Icon name="eye" size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="Print tag"
                        onClick={() => printOrderTag(order)}
                      >
                        <Icon name="tag" size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button icon-only success"
                        title="Download invoice"
                        onClick={() => {
                          if (order.invoiceUrl) {
                            downloadInvoice(order.invoiceUrl);
                          } else {
                            setSelected(order);
                          }
                        }}
                      >
                        <Icon name="receipt" size={16} />
                      </button>

                      {canManage() && (
                        <button
                          type="button"
                          className="icon-button icon-only danger"
                          title="Delete order"
                          onClick={() => handleDelete(order)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateOrderModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchOrders}
        />
      )}

      {selected && (
        <OrderDetailDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={fetchOrders}
        />
      )}
    </DashboardLayout>
  );
}
