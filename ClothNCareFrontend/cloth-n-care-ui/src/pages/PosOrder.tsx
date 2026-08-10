import { useEffect, useMemo, useState } from "react";
import { getCustomers, createCustomer, type Customer } from "../api/customers";
import { getServices, type Service } from "../api/services";
import { createOrder, recordPayment } from "../api/orders";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import type { Order, PaymentMethod } from "../types/order";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../types/order";
import { formatMoney } from "../utils/format";
import { downloadInvoice } from "../utils/invoice";

interface CartItem {
  key: string;
  service: Service;
  quantity: number;
}

const tomorrowISO = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

export default function PosOrderPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(tomorrowISO());
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");

  useEffect(() => {
    let ignore = false;

    Promise.all([getCustomers(), getServices()])
      .then(([customerList, serviceList]) => {
        if (!ignore) {
          setCustomers(customerList);
          setServices(serviceList.filter((service) => service.active));
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

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.service.price * item.quantity,
        0,
      ),
    [cart],
  );

  const discountNum = useMemo(() => {
    const num = Number(discount);
    return Number.isNaN(num) || num < 0 ? 0 : num;
  }, [discount]);

  const estimatedTotal = Math.max(0, subtotal - discountNum);

  const addToCart = (service: Service) => {
    setCart((current) => {
      const existing = current.find((item) => item.service.id === service.id);
      if (existing) {
        return current.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...current, { key: crypto.randomUUID(), service, quantity: 1 }];
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (key: string) => {
    setCart((current) => current.filter((item) => item.key !== key));
  };

  const resetCart = () => {
    setCart([]);
    setDiscount("");
    setDeliveryDate(tomorrowISO());
    setPayAmount("");
    setPlacedOrder(null);
    setError("");
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setError("Add at least one service to the order");
      return;
    }

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
        setError("Select a customer or enter the new customer's name and phone");
        return;
      }
      try {
        const customer = await createCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
        });
        resolvedCustomerId = customer.id;
      } catch (err) {
        console.error(err);
        setError("Failed to create customer");
        return;
      }
    }

    try {
      setPlacing(true);
      setError("");
      const order = await createOrder({
        customerId: resolvedCustomerId,
        items: cart.map((item) => ({
          service_type: item.service.name,
          product_type: item.service.productType,
          quantity: item.quantity,
        })),
        expected_delivery_date: deliveryDate,
        discount: discountNum,
      });
      setPlacedOrder(order);
      setPayAmount(order.balanceDue.toString());
      setCart([]);
      const refreshed = await getCustomers();
      setCustomers(refreshed);
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Failed to place order";
      setError(message);
    } finally {
      setPlacing(false);
    }
  };

  const handlePay = async () => {
    if (!placedOrder) return;
    const amountNum = Number(payAmount);
    if (
      payAmount.trim() === "" ||
      Number.isNaN(amountNum) ||
      amountNum <= 0 ||
      amountNum > placedOrder.balanceDue
    ) {
      setError("Enter a valid payment amount");
      return;
    }
    try {
      setPlacing(true);
      setError("");
      const updated = await recordPayment(placedOrder.id, {
        amount: amountNum,
        method: payMethod,
      });
      setPlacedOrder(updated);
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Failed to record payment";
      setError(message);
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading point of sale...</div>
      </DashboardLayout>
    );
  }

  if (placedOrder) {
    return (
      <DashboardLayout>
        <div className="table-card">
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <Icon name="check" size={40} className="stat-card-icon success" />
            <h2 style={{ margin: "12px 0 4px" }}>Order placed</h2>
            <p className="cell-muted">
              {placedOrder.invoiceNumber ?? placedOrder.id.slice(0, 8)} ·{" "}
              {formatMoney(placedOrder.totalPrice)}
            </p>
          </div>

          <div className="form-grid" style={{ padding: "0 16px 16px" }}>
            <div className="form-field">
              <label htmlFor="pos-pay-amount">Payment Amount</label>
              <input
                id="pos-pay-amount"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="pos-pay-method">Method</label>
              <select
                id="pos-pay-method"
                className="form-input"
                value={payMethod}
                onChange={(event) =>
                  setPayMethod(event.target.value as PaymentMethod)
                }
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {placedOrder.balanceDue > 0 && (
            <div className="detail-grid" style={{ padding: "0 16px" }}>
              <div>
                <span className="detail-label">Balance Due</span>
                <span className="detail-value amount-due">
                  {formatMoney(placedOrder.balanceDue)}
                </span>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetCart}
            >
              New Order
            </button>
            {placedOrder.balanceDue > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={placing}
                onClick={handlePay}
              >
                {placing ? "Recording..." : "Receive Payment"}
              </button>
            )}
            {placedOrder.invoiceUrl && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadInvoice(placedOrder.invoiceUrl)}
              >
                <Icon name="receipt" size={16} />
                Download Invoice
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>POS Order</h1>
          <p>Quick order entry with instant billing</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div className="form-field">
          <label htmlFor="pos-customer">Customer</label>
          <select
            id="pos-customer"
            className="form-input"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              setError("");
            }}
          >
            <option value="">New customer...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.phone ? ` · ${customer.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        {!customerId && (
          <>
            <div className="form-field">
              <label htmlFor="pos-new-name">New Customer Name</label>
              <input
                id="pos-new-name"
                type="text"
                className="form-input"
                value={newCustomerName}
                onChange={(event) => setNewCustomerName(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="pos-new-phone">New Customer Phone</label>
              <input
                id="pos-new-phone"
                type="text"
                className="form-input"
                value={newCustomerPhone}
                onChange={(event) => setNewCustomerPhone(event.target.value)}
              />
            </div>
          </>
        )}

        <div className="form-field">
          <label htmlFor="pos-delivery">Expected Delivery</label>
          <input
            id="pos-delivery"
            type="date"
            className="form-input"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="table-card" style={{ padding: 16 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Services</h2>
          <div className="kpi-grid">
            {services.length === 0 ? (
              <p className="cell-muted">No active services configured</p>
            ) : (
              services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className="stat-card"
                  style={{ cursor: "pointer", textAlign: "left", width: "100%" }}
                  onClick={() => addToCart(service)}
                >
                  <div className="stat-card-top">
                    <span className="stat-card-label">{service.name}</span>
                    <span className="stat-card-icon">
                      <Icon name="plus" size={16} />
                    </span>
                  </div>
                  <div className="stat-card-value">
                    {formatMoney(service.price)}
                  </div>
                  <div className="stat-card-sub">{service.productType}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="table-card">
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Cart</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Line Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="table-empty">
                    <Icon name="shirt" size={32} className="table-empty-icon" />
                    <div>Tap a service to add it</div>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item) => (
                <tr key={item.key}>
                  <td>
                    {item.service.name}
                    <div className="muted">{item.service.productType}</div>
                  </td>
                  <td>{formatMoney(item.service.price)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => changeQuantity(item.key, -1)}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => changeQuantity(item.key, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="cell-total">
                    {formatMoney(item.service.price * item.quantity)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-only icon-button-danger"
                      title="Remove"
                      onClick={() => removeItem(item.key)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="modal-actions">
          <div className="form-field" style={{ minWidth: 140 }}>
            <label htmlFor="pos-discount">Discount</label>
            <input
              id="pos-discount"
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "right", marginRight: 12 }}>
            <div className="cell-muted">Subtotal</div>
            <div className="money" style={{ fontSize: 18 }}>
              {formatMoney(subtotal)}
            </div>
            {discountNum > 0 && (
              <div className="cell-muted">Discount −{formatMoney(discountNum)}</div>
            )}
            <div className="cell-muted">Estimated total</div>
            <div className="money" style={{ fontSize: 22 }}>
              {formatMoney(estimatedTotal)}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={placing || cart.length === 0}
            onClick={handlePlaceOrder}
          >
            {placing ? "Placing..." : "Place Order"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
