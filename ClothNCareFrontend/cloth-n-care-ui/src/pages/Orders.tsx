import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateOrderModal from "../components/CreateOrderModal";
import OrderDetailDrawer from "../components/OrderDetailDrawer";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icons";
import Pagination from "../components/Pagination";
import { getOrderPage, getOrderOverview, deleteOrder } from "../api/orders";
import { printOrderTag, downloadInvoice } from "../utils/invoice";
import DashboardLayout from "../layout/DashboardLayout";
import ImportExportButtons from "../components/ImportExportButtons";
import type { Order } from "../types/order";
import { ORDER_STATUSES } from "../types/order";
import { formatMoney, formatDate } from "../utils/format";
import { canManage } from "../utils/auth";

const statusFilters = ["ALL", ...ORDER_STATUSES];
const paymentFilters = ["ALL", "PAID", "PARTIAL", "UNPAID"];
const sortOptions = [
  { value: "created_at,desc", label: "Newest first" },
  { value: "created_at,asc", label: "Oldest first" },
  { value: "expected_delivery_date,desc", label: "Delivery date" },
  { value: "total_price,desc", label: "Amount (high to low)" },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Order[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [overview, setOverview] = useState<{
    total: number;
    active: number;
    due: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("created_at,desc");

  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    getOrderPage({
      page,
      q: debouncedSearch || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      payment: paymentFilter === "ALL" ? undefined : paymentFilter,
      sort: sortBy,
    })
      .then((data) => {
        if (ignore) return;
        setLoadError(null);
        const sortedContent = [...data.content].sort((a, b) => {
          const aInv = (a.invoiceNumber ?? "").toString().toLowerCase().startsWith("inv");
          const bInv = (b.invoiceNumber ?? "").toString().toLowerCase().startsWith("inv");
          if (aInv !== bInv) return aInv ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setRows(sortedContent);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setSelected((current) =>
          current ? data.content.find((order) => order.id === current.id) ?? null : null,
        );
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) {
          setRows([]);
          setLoadError("Could not load orders. Check your connection and sign in again if needed.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, reloadKey, debouncedSearch, statusFilter, paymentFilter, sortBy]);

  useEffect(() => {
    let ignore = false;
    getOrderOverview()
      .then((data) => {
        if (!ignore) setOverview(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleDelete = async (order: Order) => {
    if (!window.confirm(`Delete order ${order.invoiceNumber ?? order.id.slice(0, 8)}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteOrder(order.id);
      if (selected?.id === order.id) setSelected(null);
      setPage(0);
      reload();
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete order");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading orders...</div>
      </DashboardLayout>
    );
  }

  const summary = overview
    ? `${overview.total} total · ${overview.active} active · ${overview.due} with outstanding balance`
    : `${totalElements} total`;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Orders</h1>
          <p>{summary}</p>
        </div>

        <div className="page-header-actions">
          <ImportExportButtons
            resource="orders"
            onImported={reload}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/pos")}
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
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(0);
          }}
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
          onChange={(event) => {
            setPaymentFilter(event.target.value);
            setPage(0);
          }}
          aria-label="Filter by payment"
        >
          {paymentFilters.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All payments" : status}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value);
            setPage(0);
          }}
          aria-label="Sort orders"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
            {loadError ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    <div>{loadError}</div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    <Icon name="orders" size={32} className="table-empty-icon" />
                    <div>No orders found</div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((order) => (
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

                      {order.status !== "CANCELLED" && (
                        <button
                          type="button"
                          className="icon-button icon-only"
                          title="Edit order"
                          onClick={() => setEditOrder(order)}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                      )}

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

        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={10}
          onPageChange={setPage}
        />
      </div>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={reload}
          onEdit={(order) => {
            setSelected(null);
            setEditOrder(order);
          }}
        />
      )}

      {editOrder && (
        <CreateOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSuccess={reload}
        />
      )}
    </DashboardLayout>
  );
}
