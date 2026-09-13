import { useEffect, useMemo, useState } from "react";
import { getCustomers, createCustomer, type Customer } from "../api/customers";
import { getActiveCatalog, type Product } from "../api/products";
import { createOrder, recordPayment } from "../api/orders";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import type { Order, PaymentMethod } from "../types/order";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../types/order";
import { formatMoney } from "../utils/format";
import { uid } from "../utils/format";
import { downloadInvoice } from "../utils/invoice";

interface CartItem {
  key: string;
  product: Product;
  quantity: number;
}

const tomorrowISO = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const groupCatalog = (products: Product[]) => {
  const services = new Map<string, Map<string, Product[]>>();
  for (const product of products) {
    const serviceName = product.service || "General";
    let categories = services.get(serviceName);
    if (!categories) {
      categories = new Map<string, Product[]>();
      services.set(serviceName, categories);
    }
    const categoryName = product.category || "General";
    let list = categories.get(categoryName);
    if (!list) {
      list = [];
      categories.set(categoryName, list);
    }
    list.push(product);
  }
  return services;
};

const isWeightUom = (product: Product): boolean =>
  (product.unit || "").toLowerCase() === "kg";

export default function PosOrderPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<Map<string, Map<string, Product[]>>>(new Map());
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [service, setService] = useState("");
  const [category, setCategory] = useState("");
  const [productSearch, setProductSearch] = useState("");
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

    Promise.all([getCustomers(), getActiveCatalog()])
      .then(([customerList, productList]) => {
        if (!ignore) {
          setCustomers(customerList);
          const grouped = groupCatalog(productList);
          setCatalog(grouped);
          const firstService = grouped.keys().next().value as string | undefined;
          if (firstService) {
            setService(firstService);
            const firstCategory = grouped
              .get(firstService)!
              .keys().next().value as string | undefined;
            if (firstCategory) {
              setCategory(firstCategory);
            }
          }
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

  const serviceNames = useMemo(() => Array.from(catalog.keys()), [catalog]);

  const categoryNames = useMemo(() => {
    if (!service) return [];
    return Array.from(catalog.get(service)?.keys() ?? []);
  }, [catalog, service]);

  const visibleProducts = useMemo(() => {
    let list = catalog.get(service)?.get(category) ?? [];
    const term = productSearch.trim().toLowerCase();
    if (term) {
      list = list.filter((product) =>
        product.name.toLowerCase().includes(term),
      );
    }
    return list;
  }, [catalog, service, category, productSearch]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );

  const discountNum = useMemo(() => {
    const num = Number(discount);
    return Number.isNaN(num) || num < 0 ? 0 : num;
  }, [discount]);

  const estimatedTotal = Math.max(0, subtotal - discountNum);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...current,
        { key: uid(), product, quantity: isWeightUom(product) ? 0.5 : 1 },
      ];
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.key !== key) return item;
          const step = isWeightUom(item.product) ? 0.1 : 1;
          const next = Math.max(step, item.quantity + delta);
          return {
            ...item,
            quantity: isWeightUom(item.product)
              ? Math.round(next * 10) / 10
              : Math.round(next),
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const setQuantityValue = (key: string, value: string) => {
    const num = Number(value);
    setCart((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, quantity: Number.isNaN(num) ? 0 : num }
          : item,
      ),
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
      setError("Add at least one product to the order");
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
          product_id: item.product.id,
          product_name: item.product.name,
          service_type: item.product.service,
          product_type: item.product.category,
          uom: item.product.unit,
          quantity: item.quantity,
          unit_price: item.product.price,
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
          <p>Select service, category, and product — pricing is automatic</p>
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
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>
            {service ? `Service: ${service}` : "Services"}
          </h2>

          <div className="kpi-grid">
            {serviceNames.length === 0 ? (
              <p className="cell-muted">No active products configured</p>
            ) : (
              serviceNames.map((serviceName) => (
                <button
                  key={serviceName}
                  type="button"
                  className="stat-card"
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    outline: service === serviceName ? "2px solid var(--primary, #2563eb)" : undefined,
                  }}
                  onClick={() => {
                    setService(serviceName);
                    setCategory(
                      catalog.get(serviceName)?.keys().next().value as string,
                    );
                    setProductSearch("");
                  }}
                >
                  <div className="stat-card-top">
                    <span className="stat-card-label">{serviceName}</span>
                  </div>
                  <div className="stat-card-sub">
                    {catalog.get(serviceName)?.size ?? 0} categories
                  </div>
                </button>
              ))
            )}
          </div>

          {service && (
            <>
              <div className="flex gap-8" style={{ margin: "12px 0", flexWrap: "wrap" }}>
                {categoryNames.map((categoryName) => (
                  <button
                    key={categoryName}
                    type="button"
                    className={`btn btn-sm ${
                      category === categoryName ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => {
                      setCategory(categoryName);
                      setProductSearch("");
                    }}
                  >
                    {categoryName}
                  </button>
                ))}
              </div>

              <div className="form-field" style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />
              </div>

              <div className="kpi-grid">
                {visibleProducts.length === 0 ? (
                  <p className="cell-muted">No products in this category</p>
                ) : (
                  visibleProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="stat-card"
                      style={{ cursor: "pointer", textAlign: "left", width: "100%" }}
                      onClick={() => addToCart(product)}
                    >
                      <div className="stat-card-top">
                        <span className="stat-card-label">{product.name}</span>
                        <span className="stat-card-icon">
                          <Icon name="plus" size={16} />
                        </span>
                      </div>
                      <div className="stat-card-value">
                        {formatMoney(product.price)}
                      </div>
                      <div className="stat-card-sub">
                        {product.unit || "Nos"} · {product.category}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="table-card">
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Cart</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Rate</th>
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
                    <div>Select a product to add it</div>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item) => (
                <tr key={item.key}>
                  <td>
                    {item.product.name}
                    <div className="muted">
                      {item.product.service} · {item.product.category}
                    </div>
                  </td>
                  <td>
                    {isWeightUom(item.product) ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-input"
                        style={{ maxWidth: 90, textAlign: "right" }}
                        value={item.quantity}
                        onChange={(event) =>
                          setQuantityValue(item.key, event.target.value)
                        }
                        aria-label={`Quantity for ${item.product.name}`}
                      />
                    ) : (
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
                    )}
                  </td>
                  <td className="cell-total">{formatMoney(item.product.price)}</td>
                  <td className="cell-total">
                    {formatMoney(item.product.price * item.quantity)}
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