import Icon from "./Icons";
import StatusBadge from "./StatusBadge";
import type { CustomerDetail } from "../api/customers";
import { formatDate, formatDateTime, formatMoney } from "../utils/format";

interface Props {
  customer: CustomerDetail;
  loading: boolean;
  onClose: () => void;
}

export default function CustomerDetailDrawer({
  customer,
  loading,
  onClose,
}: Props) {
  return (
    <div className="drawer-backdrop" role="presentation">
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-drawer-title"
      >
        <div className="drawer-header">
          <div>
            <h2 id="customer-drawer-title">{customer.name}</h2>
            <p>Customer profile</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{customer.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{customer.email || "-"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Address</span>
              <span className="detail-value">{customer.address || "-"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Member Since</span>
              <span className="detail-value">
                {formatDate(customer.createdAt)}
              </span>
            </div>
            {customer.notes && (
              <div className="detail-item detail-item-wide">
                <span className="detail-label">Notes</span>
                <span className="detail-value">{customer.notes}</span>
              </div>
            )}
          </div>

          <div className="detail-stats">
            <div className="detail-stat">
              <span className="detail-stat-label">Total Orders</span>
              <span className="detail-stat-value">{customer.orderCount}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">Total Spent</span>
              <span className="detail-stat-value">
                {formatMoney(customer.totalSpent)}
              </span>
            </div>
          </div>

          <div className="section-title">
            <h3>Order History</h3>
          </div>

          {loading ? (
            <div className="empty-state">Loading history...</div>
          ) : customer.orders.length === 0 ? (
            <div className="empty-state">No orders yet</div>
          ) : (
            <div className="customer-orders">
              {customer.orders.map((order) => (
                <div className="customer-order" key={order.id}>
                  <div className="customer-order-row">
                    <span className="customer-order-title">
                      #{order.invoiceNumber || order.id}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="customer-order-row customer-order-meta">
                    <span>
                      {formatDateTime(order.createdAt)} &middot;{" "}
                      {order.items?.length ?? 0} item(s)
                    </span>
                    <span className="customer-order-total">
                      {formatMoney(order.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
