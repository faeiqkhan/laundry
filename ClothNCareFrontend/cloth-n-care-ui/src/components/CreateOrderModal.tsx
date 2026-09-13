import { useEffect, useState } from "react";
import {
  createCustomer,
  getCustomers,
  type Customer,
} from "../api/customers";
import { getServices, type Service } from "../api/services";
import { createOrder } from "../api/orders";
import Icon from "./Icons";
import "./DashboardShell.css";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItemDraft {
  service_type: string;
  product_type: string;
  quantity: number;
  unit_price: string;
}

const createEmptyItem = (): OrderItemDraft => ({
  service_type: "",
  product_type: "",
  quantity: 1,
  unit_price: "",
});

const uniqueValues = (values: string[]) => Array.from(new Set(values));

export default function CreateOrderModal({ onClose, onSuccess }: Props) {
  const [items, setItems] = useState<OrderItemDraft[]>([createEmptyItem()]);
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
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const activeServices = services.filter((service) => service.active);
  const serviceNames = uniqueValues(
    activeServices.map((service) => service.name).filter(Boolean),
  );

  useEffect(() => {
    let ignore = false;

    Promise.all([getServices(), getCustomers()])
      .then(([servicesData, customersData]) => {
        if (!ignore) {
          setServices(servicesData);
          setCustomers(customersData);
          setFiltered(customersData);
        }
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const addItem = () => {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
  };

  const updateItem = (
    index: number,
    field: keyof OrderItemDraft,
    value: string | number,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    setItems((currentItems) =>
      currentItems.length === 1
        ? currentItems
        : currentItems.filter((_, itemIndex) => itemIndex !== index),
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

      setCustomers((currentCustomers) => [...currentCustomers, created]);
      setFiltered((currentFiltered) => [...currentFiltered, created]);
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
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    const hasInvalidItem = items.some(
      (item) =>
        !item.service_type ||
        !item.product_type ||
        item.quantity <= 0 ||
        (item.unit_price !== "" && Number(item.unit_price) < 0) ||
        !activeServices.some(
          (service) =>
            service.name === item.service_type &&
            service.productType === item.product_type,
        ),
    );

    if (hasInvalidItem) {
      alert("Please select a valid service, product, and quantity for each item");
      return;
    }

    const discountNum = discount ? Number(discount) : 0;
    if (Number.isNaN(discountNum) || discountNum < 0) {
      alert("Please enter a valid discount amount");
      return;
    }

    try {
      setLoading(true);

      await createOrder({
        customerId: selectedCustomer.id,
        phone: selectedCustomer.phone,
        items: items.map((item) => ({
          service_type: item.service_type,
          product_type: item.product_type,
          quantity: item.quantity,
          unit_price: item.unit_price !== "" ? Number(item.unit_price) : undefined,
        })),
        expected_delivery_date: deliveryDate,
        discount: discountNum,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create order");
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
            <h2 id="create-order-title">Create Order</h2>
            <p>Select a customer and add services to the order</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label>Customer</label>
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
                      setNewCustomer((currentCustomer) => ({
                        ...currentCustomer,
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
                    setNewCustomer((currentCustomer) => ({
                      ...currentCustomer,
                      name: event.target.value,
                    }))
                  }
                />

                <input
                  placeholder="Phone"
                  className="form-input"
                  value={newCustomer.phone}
                  onChange={(event) =>
                    setNewCustomer((currentCustomer) => ({
                      ...currentCustomer,
                      phone: event.target.value,
                    }))
                  }
                />

                <input
                  placeholder="Email (optional)"
                  type="email"
                  className="form-input"
                  value={newCustomer.email}
                  onChange={(event) =>
                    setNewCustomer((currentCustomer) => ({
                      ...currentCustomer,
                      email: event.target.value,
                    }))
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
            <label>Services</label>
            <div className="modal-items">
              {items.map((item, index) => (
                <div key={index} className="modal-item-row">
                  <select
                    className="form-input"
                    value={item.service_type}
                    onChange={(event) => {
                      updateItem(index, "service_type", event.target.value);
                      updateItem(index, "product_type", "");
                    }}
                  >
                    <option value="">Select Service</option>
                    {serviceNames.map((serviceName) => (
                      <option key={serviceName} value={serviceName}>
                        {serviceName}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-input"
                    value={item.product_type}
                    onChange={(event) => {
                      const productType = event.target.value;
                      updateItem(index, "product_type", productType);
                      const matched = activeServices.find(
                        (service) =>
                          service.name === item.service_type &&
                          service.productType === productType,
                      );
                      updateItem(
                        index,
                        "unit_price",
                        matched ? String(matched.price) : "",
                      );
                    }}
                    disabled={!item.service_type}
                  >
                    <option value="">Select Product</option>
                    {activeServices
                      .filter((service) => service.name === item.service_type)
                      .map((service) => (
                        <option key={service.id} value={service.productType}>
                          {service.productType}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    className="form-input quantity-input"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, "quantity", Number(event.target.value))
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input quantity-input"
                    placeholder="Price"
                    style={{ maxWidth: 110 }}
                    value={item.unit_price}
                    onChange={(event) =>
                      updateItem(index, "unit_price", event.target.value)
                    }
                    disabled={!item.product_type}
                    aria-label="Unit price"
                  />

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem} className="link-button">
              + Add Item
            </button>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="order-discount">Discount ({`\u20b9`})</label>
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
            {loading ? "Creating..." : "Create Order"}
          </button>
        </div>
      </section>
    </div>
  );
}
