import { useEffect, useMemo, useState } from "react";
import { getCustomers, createCustomer, type Customer } from "../api/customers";
import { createProduct, getActiveCatalog, type Product } from "../api/products";
import { createOrder, recordPayment } from "../api/orders";
import { getSettings, type Settings } from "../api/settings";
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
  unitPrice: string;
}

const tomorrowISO = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const SERVICE_ORDER = [
  "dry cleaning",
  "steam iron",
  "laundry services",
  "household",
  "woolen laundry",
  "others",
  "shoes dc",
];

const serviceOrderIndex = (serviceName: string): number => {
  const index = SERVICE_ORDER.indexOf(serviceName.trim().toLowerCase());
  return index === -1 ? SERVICE_ORDER.length : index;
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
  return new Map(
    [...services.entries()].sort(([serviceA], [serviceB]) => {
      const orderDifference =
        serviceOrderIndex(serviceA) - serviceOrderIndex(serviceB);
      return orderDifference !== 0
        ? orderDifference
        : serviceA.localeCompare(serviceB);
    }),
  );
};

const isWeightUom = (product: Product): boolean =>
  (product.unit || "").toLowerCase() === "kg";

const round2 = (value: number): number => Math.round(value * 100) / 100;

export default function PosOrderPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<Map<string, Map<string, Product[]>>>(new Map());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [service, setService] = useState("");
  const [category, setCategory] = useState("");
  const [customService, setCustomService] = useState("");
  const [customCategory, setCustomCategory] = useState("");
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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    service: "",
    category: "",
    unit: "Nos",
    price: "",
  });

  useEffect(() => {
    let ignore = false;

    Promise.all([getCustomers(), getActiveCatalog(), getSettings()])
      .then(([customerList, productList, appSettings]) => {
        if (!ignore) {
          setCustomers(customerList);
          setSettings(appSettings);
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

  const currencySymbol = settings?.currencySymbol || "\u20b9";
  const money = (value: number | null | undefined): string =>
    formatMoney(value, currencySymbol);

  const serviceNames = useMemo(() => Array.from(catalog.keys()), [catalog]);

  const selectedService = service === "__custom__" ? customService.trim() : service;
  const selectedCategory = category === "__custom__" ? customCategory.trim() : category;

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    );
  }, [customers, customerSearch]);

  const categoryNames = useMemo(() => {
    if (!selectedService) return [];
    return Array.from(catalog.get(selectedService)?.keys() ?? []);
  }, [catalog, selectedService]);

  const visibleProducts = useMemo(() => {
    let list = catalog.get(selectedService)?.get(selectedCategory) ?? [];
    const term = productSearch.trim().toLowerCase();
    if (term) {
      list = list.filter((product) =>
        product.name.toLowerCase().includes(term),
      );
    }
    return list;
  }, [catalog, selectedService, selectedCategory, productSearch]);

  const handleCreateProduct = async () => {
    const serviceName = newProduct.service.trim() || selectedService;
    const categoryName = newProduct.category.trim() || selectedCategory;
    const price = Number(newProduct.price);

    if (!newProduct.name.trim() || !serviceName || !categoryName) {
      setError("Enter a product name, service, and category");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid product price");
      return;
    }

    try {
      setCreatingProduct(true);
      setError("");
      const createdProduct = await createProduct({
        name: newProduct.name.trim(),
        service: serviceName,
        category: categoryName,
        unit: newProduct.unit.trim() || "Nos",
        price,
        active: true,
      });
      const refreshed = await getActiveCatalog();
      const grouped = groupCatalog(refreshed);
      setCatalog(grouped);
      setService(serviceName);
      setCategory(categoryName);
      setProductSearch("");
      setCart((current) => {
        const existing = current.find((item) => item.product.id === createdProduct.id);
        if (existing) {
          return current.map((item) =>
            item.product.id === createdProduct.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [
          ...current,
          {
            key: uid(),
            product: createdProduct,
            quantity: isWeightUom(createdProduct) ? 0.5 : 1,
            unitPrice: String(createdProduct.price),
          },
        ];
      });
      setNewProduct({ name: "", service: "", category: "", unit: "Nos", price: "" });
      setShowAddProduct(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create product");
    } finally {
      setCreatingProduct(false);
    }
  };

  const resolvedPrice = (item: CartItem): number => {
    const num = Number(item.unitPrice);
    return Number.isFinite(num) && num >= 0 ? num : item.product.price;
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + resolvedPrice(item) * item.quantity, 0),
    [cart],
  );

  const taxRate = settings?.taxRate ?? 0;

  const discountNum = useMemo(() => {
    const num = Number(discount);
    return Number.isNaN(num) || num < 0 ? 0 : num;
  }, [discount]);

  const appliedDiscount = Math.min(discountNum, subtotal);
  const taxable = Math.max(0, subtotal - appliedDiscount);
  const taxAmount = round2((taxable * taxRate) / 100);
  const grandTotal = round2(taxable + taxAmount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        {
          key: uid(),
          product,
          quantity: isWeightUom(product) ? 0.5 : 1,
          unitPrice: String(product.price),
        },
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

  const setUnitPriceValue = (key: string, value: string) => {
    setCart((current) =>
      current.map((item) =>
        item.key === key ? { ...item, unitPrice: value } : item,
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
          unit_price: resolvedPrice(item),
        })),
        expected_delivery_date: deliveryDate,
        discount: appliedDiscount,
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
        <div className="pos-success">
          <div className="pos-success-icon">
            <Icon name="check" size={40} />
          </div>
          <h2>Order placed</h2>
          <p className="cell-muted">
            {placedOrder.invoiceNumber ?? placedOrder.id.slice(0, 8)} ·{" "}
            {money(placedOrder.totalPrice)}
          </p>

          <div className="form-grid" style={{ padding: "0 16px 16px", maxWidth: 520, margin: "0 auto" }}>
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
            <div className="pos-balance">
              <span className="detail-label">Balance Due</span>
              <span className="amount-due">{money(placedOrder.balanceDue)}</span>
            </div>
          )}

          <div className="modal-actions" style={{ justifyContent: "center" }}>
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
          <h1>New Order</h1>
          <p>Quick full-service billing — pick products, adjust rates if needed</p>
        </div>
        {cart.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={resetCart}>
            <Icon name="close" size={16} />
            Clear all
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="pos-order-bar">
        <div className="form-field pos-order-field pos-order-customer">
          <label htmlFor="pos-customer-search">Customer</label>
          <div className="customer-search">
            <input
              id="pos-customer-search"
              type="search"
              className="select-slim"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(event) => {
                setCustomerSearch(event.target.value);
                setCustomerId("");
                setShowCustomerDropdown(true);
                setError("");
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              aria-label="Search customer by name, phone, or email"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="customer-dropdown">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="customer-option"
                    onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerSearch(
                        `${customer.name}${customer.phone ? ` - ${customer.phone}` : ""}`,
                      );
                      setShowCustomerDropdown(false);
                      setError("");
                    }}
                  >
                    {customer.name}
                    {customer.phone ? ` - ${customer.phone}` : ""}
                  </button>
                ))}
              </div>
            )}
            {showCustomerDropdown && customerSearch.trim() && filteredCustomers.length === 0 && (
              <div className="customer-dropdown no-results-dropdown">
                <p className="no-results-text">No customer found</p>
              </div>
            )}
          </div>
        </div>

        {!customerId && (
          <>
            <div className="form-field pos-order-field">
              <label htmlFor="pos-new-name">Name</label>
              <input
                id="pos-new-name"
                type="text"
                className="select-slim"
                value={newCustomerName}
                onChange={(event) => setNewCustomerName(event.target.value)}
              />
            </div>
            <div className="form-field pos-order-field">
              <label htmlFor="pos-new-phone">Phone</label>
              <input
                id="pos-new-phone"
                type="text"
                className="select-slim"
                value={newCustomerPhone}
                onChange={(event) => setNewCustomerPhone(event.target.value)}
              />
            </div>
          </>
        )}

        <div className="form-field pos-order-field">
          <label htmlFor="pos-delivery">Expected Delivery</label>
          <input
            id="pos-delivery"
            type="date"
            className="select-slim"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
        </div>
      </div>

      <div className="pos-layout">
        <div className="pos-catalog">
          <div className="pos-catalog-toolbar">
            <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
              {serviceNames.map((serviceName) => (
                <button
                  key={serviceName}
                  type="button"
                  className={`service-chip ${
                    service === serviceName ? "service-chip-active" : ""
                  }`}
                  onClick={() => {
                    setService(serviceName);
                    setCustomService("");
                    setCategory(
                      catalog.get(serviceName)?.keys().next().value as string,
                    );
                    setProductSearch("");
                  }}
                >
                  <Icon name="tag" size={15} />
                  {serviceName}
                  <span className="service-chip-count">
                    {catalog.get(serviceName)?.size ?? 0}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={`service-chip ${service === "__custom__" ? "service-chip-active" : ""}`}
                onClick={() => {
                  setService("__custom__");
                  setCategory("__custom__");
                  setProductSearch("");
                }}
              >
                <Icon name="plus" size={15} />
                Custom service
              </button>
            </div>
            {service === "__custom__" && (
              <input
                className="form-input"
                placeholder="Enter service name"
                value={customService}
                onChange={(event) => setCustomService(event.target.value)}
              />
            )}
          </div>

          <div className="pos-catalog-filters">
            <div className="category-pills">
              {categoryNames.map((categoryName) => (
                <button
                  key={categoryName}
                  type="button"
                  className={`category-pill ${
                    category === categoryName ? "category-pill-active" : ""
                  }`}
                  onClick={() => {
                    setCategory(categoryName);
                    setCustomCategory("");
                    setProductSearch("");
                  }}
                >
                  {categoryName}
                </button>
              ))}
              <button
                type="button"
                className={`category-pill ${category === "__custom__" ? "category-pill-active" : ""}`}
                onClick={() => {
                  setCategory("__custom__");
                  setProductSearch("");
                }}
              >
                + Custom category
              </button>
            </div>
            {category === "__custom__" && (
              <input
                className="form-input"
                placeholder="Enter category name"
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
              />
            )}

            <div className="search-box" style={{ maxWidth: 260 }}>
              <Icon name="search" size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="pos-product-grid">
            {visibleProducts.length === 0 ? (
              <div className="table-empty">
                <Icon name="shirt" size={32} className="table-empty-icon" />
                <div>No products in this category</div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setNewProduct({
                      name: productSearch.trim(),
                      service: selectedService,
                      category: selectedCategory,
                      unit: "Nos",
                      price: "",
                    });
                    setShowAddProduct(true);
                  }}
                >
                  <Icon name="plus" size={14} />
                  Add product
                </button>
              </div>
            ) : (
              visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="pos-product"
                  onClick={() => addToCart(product)}
                >
                  <div className="pos-product-name">{product.name}</div>
                  <div className="pos-product-meta">
                    {product.unit || "Nos"} · {product.category}
                  </div>
                  <div className="pos-product-foot">
                    <span className="pos-product-price">
                      {money(product.price)}
                    </span>
                    <span className="pos-product-add">
                      <Icon name="plus" size={14} />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {showAddProduct && (
            <div className="new-customer-panel">
              <h3>Add Product</h3>
              <div className="new-customer-grid">
                <input
                  className="form-input"
                  placeholder="Product name"
                  value={newProduct.name}
                  onChange={(event) =>
                    setNewProduct((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <input
                  className="form-input"
                  placeholder="Service"
                  value={newProduct.service}
                  onChange={(event) =>
                    setNewProduct((current) => ({ ...current, service: event.target.value }))
                  }
                />
                <input
                  className="form-input"
                  placeholder="Category"
                  value={newProduct.category}
                  onChange={(event) =>
                    setNewProduct((current) => ({ ...current, category: event.target.value }))
                  }
                />
                <input
                  className="form-input"
                  placeholder="Unit (e.g. Nos, Kg)"
                  value={newProduct.unit}
                  onChange={(event) =>
                    setNewProduct((current) => ({ ...current, unit: event.target.value }))
                  }
                />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(event) =>
                    setNewProduct((current) => ({ ...current, price: event.target.value }))
                  }
                />
              </div>
              <div className="new-customer-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddProduct(false)}
                  disabled={creatingProduct}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateProduct}
                  disabled={creatingProduct}
                >
                  {creatingProduct ? "Saving..." : "Save Product"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="pos-cart">
          <div className="pos-cart-header">
            <div>
              <h2>Order Summary</h2>
              <p>
                {itemCount.toLocaleString()} item{itemCount === 1 ? "" : "s"}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                className="icon-button icon-only icon-button-danger"
                title="Clear cart"
                onClick={resetCart}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>

          <div className="pos-cart-list">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <Icon name="bag" size={34} className="pos-cart-empty-icon" />
                <div>Cart is empty</div>
                <p className="cell-muted">Select products from the catalog</p>
              </div>
            ) : (
              cart.map((item) => {
                const unitPrice = resolvedPrice(item);
                const weight = isWeightUom(item.product);
                return (
                  <div className="pos-cart-item" key={item.key}>
                    <div className="pos-cart-item-head">
                      <div>
                        <div className="pos-cart-item-name">{item.product.name}</div>
                        <div className="pos-cart-item-meta">
                          {item.product.service} · {item.product.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="icon-button icon-only icon-button-danger"
                        title="Remove"
                        onClick={() => removeItem(item.key)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>

                    <div className="pos-cart-item-controls">
                      <div className="qty-stepper">
                        <button
                          type="button"
                          className="qty-step-btn"
                          onClick={() => changeQuantity(item.key, -1)}
                          disabled={item.quantity <= 0}
                        >
                          −
                        </button>
                        {weight ? (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="qty-input qty-input-weight"
                            value={item.quantity}
                            onChange={(event) =>
                              setQuantityValue(item.key, event.target.value)
                            }
                            aria-label={`Quantity for ${item.product.name}`}
                          />
                        ) : (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="qty-input"
                            value={item.quantity}
                            onChange={(event) =>
                              setQuantityValue(item.key, event.target.value)
                            }
                            aria-label={`Quantity for ${item.product.name}`}
                          />
                        )}
                        <button
                          type="button"
                          className="qty-step-btn"
                          onClick={() => changeQuantity(item.key, 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="rate-input-wrap">
                        <span className="rate-input-symbol">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="rate-input"
                          value={item.unitPrice}
                          onChange={(event) =>
                            setUnitPriceValue(item.key, event.target.value)
                          }
                          placeholder="0.00"
                          aria-label={`Unit price for ${item.product.name}`}
                        />
                      </div>

                      <div className="pos-cart-line-total">
                        {money(round2(unitPrice * item.quantity))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pos-summary">
            <div className="pos-summary-row">
              <span>Subtotal</span>
              <span>{money(round2(subtotal))}</span>
            </div>
            <div className="pos-summary-row">
              <span>Discount</span>
              <div className="discount-input-wrap">
                <span className="rate-input-symbol">−</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="rate-input discount-input"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  placeholder="0.00"
                  aria-label="Discount amount"
                />
              </div>
            </div>
            {taxAmount > 0 && (
              <div className="pos-summary-row">
                <span>Tax ({taxRate}%)</span>
                <span>{money(taxAmount)}</span>
              </div>
            )}
            <div className="pos-summary-row pos-summary-grand">
              <span>Grand Total</span>
              <span>{money(grandTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary pos-place-btn"
            disabled={placing || cart.length === 0}
            onClick={handlePlaceOrder}
          >
            {placing ? "Placing..." : `Place Order · ${money(grandTotal)}`}
          </button>
        </aside>
      </div>
    </DashboardLayout>
  );
}