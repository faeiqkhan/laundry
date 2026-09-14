import { useEffect, useMemo, useState } from "react";
import {
  createCustomer,
  getCustomers,
  type Customer,
} from "../api/customers";
import { getActiveCatalog, type Product } from "../api/products";
import { createOrder, updateOrder, type OrderItemPayload } from "../api/orders";
import type { Order } from "../types/order";
import Icon from "./Icons";
import "./DashboardShell.css";
import { formatMoney } from "../utils/format";

interface Props {
  order?: Order;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItemDraft {
  service: string;
  category: string;
  productId: string;
  quantity: string;
  price: string;
}

const createEmptyItem = (): OrderItemDraft => ({
  service: "",
  category: "",
  productId: "",
  quantity: "",
  price: "",
});

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

export default function CreateOrderModal({ order, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<OrderItemDraft[]>(() =>
    order?.items?.length
      ? order.items.map((item) => ({
          service: item.serviceType,
          category: item.productType,
          productId: item.productId ?? "",
          quantity: String(item.quantity),
          price: String(item.unitPrice),
        }))
      : [createEmptyItem()],
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [catalog, setCatalog] = useState<Map<string, Map<string, Product[]>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState(
    order && order.discount > 0 ? String(order.discount) : "",
  );
  const [deliveryDate, setDeliveryDate] = useState(
    order?.expectedDeliveryDate ??
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );

  const serviceNames = useMemo(() => Array.from(catalog.keys()), [catalog]);

  useEffect(() => {
    let ignore = false;

    Promise.all([getActiveCatalog(), getCustomers()])
      .then(([catalogData, customersData]) => {
        if (!ignore) {
          const grouped = groupCatalog(catalogData);
          setCatalog(grouped);
          setCustomers(customersData);
          setFiltered(customersData);

          if (order) {
            const allProducts = Array.from(grouped.values()).flatMap((cats) =>
              Array.from(cats.values()).flat(),
            );
            setItems(
              order.items?.length
                ? order.items.map((item) => {
                    const match = allProducts.find(
                      (p) =>
                        p.id === item.productId ||
                        (p.name === item.productName &&
                          p.service === item.serviceType &&
                          p.category === item.productType),
                    );
                    return {
                      service: match?.service ?? item.serviceType,
                      category: match?.category ?? item.productType,
                      productId: match?.id ?? item.productId ?? "",
                      quantity: String(item.quantity),
                      price: String(item.unitPrice),
                    };
                  })
                : [createEmptyItem()],
            );
            const customer = customersData.find(
              (c) => c.phone === order.customerPhone,
            );
            setSelectedCustomer(customer ?? null);
            setSearch(
              customer
                ? `${customer.name} - ${customer.phone}`
                : order.customerName ?? "",
            );
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      ignore = true;
    };
  }, [order]);

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem()]);
  };

  const updateItem = (
    index: number,
    field: keyof OrderItemDraft,
    value: string,
  ) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index),
    );
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setSelectedCustomer(null);
    setShowAddCustomer(false);

    const filteredList = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.includes(value),
    );

    setFiltered(filteredList);
    setShowDropdown(true);
  };

  const handleCreateCustomer = async () => {
    const name = newCustomer.name.trim();
    const phone = newCustomer.phone.trim();
    const email = newCustomer.email.trim();

    if (!name || !phone) {
      alert("Please enter customer name and phone");
      return;
    }

    try {
      setCreatingCustomer(true);

      const created = await createCustomer({
        name,
        phone,
        email: email || undefined,
      });

      setCustomers((prev) => [...prev, created]);
      setFiltered((prev) => [...prev, created]);
      setSelectedCustomer(created);
      setSearch(`${created.name} - ${created.phone}`);
      setShowAddCustomer(false);
      setShowDropdown(false);
      setNewCustomer({ name: "", phone: "", email: "" });
    } catch (error) {
      console.error(error);
      alert("Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async () => {
    if (!order && !selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    const hasInvalidItem = items.some((item) => !item.productId || !item.quantity || Number(item.quantity) <= 0);

    if (hasInvalidItem) {
      alert("Please select a service, category, product, and valid quantity for each item");
      return;
    }

    const discountNum = discount ? Number(discount) : 0;
    if (Number.isNaN(discountNum) || discountNum < 0) {
      alert("Please enter a valid discount amount");
      return;
    }

    try {
      setLoading(true);

      const allProducts = Array.from(catalog.values()).flatMap((cats) =>
        Array.from(cats.values()).flat(),
      );
      const productById = new Map(allProducts.map((p) => [p.id, p]));

      const payload: {
        customerId?: string;
        phone?: string;
        items: OrderItemPayload[];
        expected_delivery_date: string;
        discount: number;
      } = {
        customerId: selectedCustomer?.id,
        phone: selectedCustomer?.phone,
        items: items.map((item) => {
          const product = productById.get(item.productId)!;
          const qty = Number(item.quantity);
          return {
            product_id: product.id,
            product_name: product.name,
            service_type: product.service,
            product_type: product.category,
            uom: product.unit,
            quantity: qty,
            unit_price:
                        item.price && Number(item.price) > 0
                          ? Number(item.price)
                          : product.price,
          };
        }),
        expected_delivery_date: deliveryDate,
        discount: discountNum,
      };

      if (order) {
        await updateOrder(order.id, payload);
      } else {
        await createOrder(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(order ? "Failed to update order" : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal modal-wide"
        aria-labelledby="create-order-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 id="create-order-title">{order ? "Edit Order" : "Create Order"}</h2>
            <p>
              {order
                ? "Adjust items, rates, discount, and delivery date"
                : "Service → Category → Product (rates are editable)"}
            </p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label>Customer</label>
            {order ? (
              <input
                className="form-input"
                value={search}
                readOnly
                aria-label="Customer"
              />
            ) : (
            <div className="customer-search">
              <input
                placeholder="Search customer (name or phone)"
                className="form-input"
                value={search}
                onChange={(event) => handleSearch(event.target.value)}
                onFocus={() => setShowDropdown(true)}
              />

              {showDropdown && filtered.length > 0 && (
                <div className="customer-dropdown">
                  {filtered.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="customer-option"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setSearch(`${customer.name} - ${customer.phone}`);
                        setShowDropdown(false);
                      }}
                    >
                      {customer.name} - {customer.phone}
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && search.trim() && filtered.length === 0 && (
                <div className="customer-dropdown no-results-dropdown">
                  <p className="no-results-text">No customer found</p>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setShowAddCustomer(true);
                      setShowDropdown(false);
                      setNewCustomer((prev) => ({
                        ...prev,
                        name: search.trim(),
                        phone: "",
                      }));
                    }}
                  >
                    + Add New Customer
                  </button>
                </div>
              )}
            </div>
            )}
          </div>

          {showAddCustomer && (
            <div className="new-customer-panel">
              <h3>New Customer</h3>
              <div className="new-customer-grid">
                <input
                  placeholder="Name"
                  className="form-input"
                  value={newCustomer.name}
                  onChange={(event) =>
                    setNewCustomer((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <input
                  placeholder="Phone"
                  className="form-input"
                  value={newCustomer.phone}
                  onChange={(event) =>
                    setNewCustomer((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
                <input
                  placeholder="Email (optional)"
                  type="email"
                  className="form-input"
                  value={newCustomer.email}
                  onChange={(event) =>
                    setNewCustomer((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>
              <div className="new-customer-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowAddCustomer(false);
                    setNewCustomer({ name: "", phone: "", email: "" });
                  }}
                  disabled={creatingCustomer}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateCustomer}
                  disabled={creatingCustomer}
                >
                  {creatingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </div>
          )}

          <div className="form-field">
            <label>Products</label>
            <div className="modal-items">
              {items.map((item, index) => {
                const categoryNames = item.service
                  ? Array.from(catalog.get(item.service)?.keys() ?? [])
                  : [];
                const productList =
                  item.service && item.category
                    ? (catalog.get(item.service)?.get(item.category) ?? [])
                    : [];
                const product = productList.find((p) => p.id === item.productId);
                const weightUom = product ? isWeightUom(product) : false;
                const effectivePrice =
                  item.price && Number(item.price) > 0
                    ? Number(item.price)
                    : product?.price ?? 0;
                const lineTotal =
                  product && item.quantity
                    ? effectivePrice * Number(item.quantity)
                    : 0;
                return (
                  <div key={index} className="modal-item-row">
                    <div className="modal-item-row-top">
                    <select
                      className="form-input"
                      value={item.service}
                      onChange={(event) => {
                        const value = event.target.value;
                        const nextCategories = catalog.get(value);
                        const firstCategory = nextCategories
                          ? nextCategories.keys().next().value
                          : "";
                        updateItem(index, "service", value);
                        updateItem(index, "category", firstCategory || "");
                        updateItem(index, "productId", "");
                        updateItem(index, "quantity", "");
                        updateItem(index, "price", "");
                      }}
                    >
                      <option value="">Service</option>
                      {serviceNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="form-input"
                      value={item.category}
                      onChange={(event) => {
                        updateItem(index, "category", event.target.value);
                        updateItem(index, "productId", "");
                        updateItem(index, "quantity", "");
                        updateItem(index, "price", "");
                      }}
                      disabled={!item.service}
                    >
                      <option value="">Category</option>
                      {categoryNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="form-input"
                      value={item.productId}
                      onChange={(event) => {
                        updateItem(index, "productId", event.target.value);
                        if (!item.quantity) {
                          updateItem(index, "quantity", "1");
                        }
                        const chosen = productList.find(
                          (p) => p.id === event.target.value,
                        );
                        updateItem(
                          index,
                          "price",
                          chosen ? String(chosen.price) : "",
                        );
                      }}
                      disabled={!item.category}
                    >
                      <option value="">Product</option>
                      {productList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.unit || "Nos"}
                        </option>
                      ))}
                    </select>
                    </div>

                    <div className="modal-item-row-bottom">
                      <div className="modal-item-field">
                        <label>{weightUom ? "Rate/Kg" : "Rate"}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input rate-input"
                          value={item.price}
                          onChange={(event) =>
                            updateItem(index, "price", event.target.value)
                          }
                          placeholder={product ? formatMoney(product.price) : "0.00"}
                          aria-label="Unit price"
                        />
                      </div>

                      <div className="modal-item-field">
                        <label>{weightUom ? "Weight (Kg)" : "Qty"}</label>
                        <input
                          type="number"
                          min={weightUom ? 0 : 1}
                          step={weightUom ? 0.1 : 1}
                          className="form-input quantity-input"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, "quantity", event.target.value)
                          }
                          placeholder={weightUom ? "0.0" : "1"}
                          aria-label="Quantity"
                        />
                      </div>

                      <div className="modal-item-field">
                        <label>Total</label>
                        <span
                          className={`modal-item-line ${
                            product && item.quantity ? "" : "modal-item-line-empty"
                          }`}
                        >
                          {product && item.quantity
                            ? formatMoney(lineTotal)
                            : "—"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        title="Remove item"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={addItem} className="link-button">
              + Add Item
            </button>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="order-discount">Discount</label>
              <input
                id="order-discount"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="order-delivery">Expected Delivery Date</label>
              <input
                id="order-delivery"
                type="date"
                className="form-input"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Saving..." : order ? "Save Changes" : "Create Order"}
          </button>
        </div>
      </section>
    </div>
  );
}
