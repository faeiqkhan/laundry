import { useEffect, useState } from "react";
import axios from "axios";
import {
  createCustomer,
  getCustomers,
  type Customer,
} from "../api/customers";
import { getServices, type Service } from "../api/services";
import { createOrder } from "../api/orders";
import "./DashboardShell.css";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItemDraft {
  service_type: string;
  product_type: string;
  quantity: number;
}

const createEmptyItem = (): OrderItemDraft => ({
  service_type: "",
  product_type: "",
  quantity: 1,
});

const uniqueValues = (values: string[]) => Array.from(new Set(values));

export default function CreateOrderModal({ onClose, onSuccess }: Props) {
  const [items, setItems] = useState<OrderItemDraft[]>([createEmptyItem()]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
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

    try {
      setLoading(true);

      await createOrder({
        customerId: selectedCustomer.id,
        phone: selectedCustomer.phone,
        items,
        expected_delivery_date: new Date().toISOString().split("T")[0],
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);

      const message =
        axios.isAxiosError<{ message?: string }>(err) &&
        err.response?.data?.message
          ? err.response.data.message
          : "Failed to create order";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="create-order-modal"
        aria-labelledby="create-order-title"
        role="dialog"
        aria-modal="true"
      >
        <h2 id="create-order-title">Create Order</h2>

        <div className="customer-search">
          <input
            placeholder="Search customer (name or phone)"
            className="modal-input"
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

        {showAddCustomer && (
          <section className="new-customer-panel">
            <h3>New Customer</h3>
            <div className="new-customer-grid">
              <input
                placeholder="Name"
                className="modal-input"
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
                className="modal-input"
                value={newCustomer.phone}
                onChange={(event) =>
                  setNewCustomer((currentCustomer) => ({
                    ...currentCustomer,
                    phone: event.target.value,
                  }))
                }
              />

              <input
                placeholder="Email"
                type="email"
                className="modal-input"
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
                className="secondary-button"
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
                className="primary-button"
                onClick={handleCreateCustomer}
                disabled={creatingCustomer}
              >
                {creatingCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </section>
        )}

        <div className="modal-items">
          {items.map((item, index) => (
            <div key={index} className="modal-item-row">
              <select
                className="modal-input"
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
                className="modal-input"
                value={item.product_type}
                onChange={(event) =>
                  updateItem(index, "product_type", event.target.value)
                }
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
                className="modal-input quantity-input"
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, "quantity", Number(event.target.value))
                }
              />

              <button
                type="button"
                className="icon-text-button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="link-button">
          + Add Item
        </button>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="secondary-button">
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="primary-button"
          >
            {loading ? "Saving..." : "Create Order"}
          </button>
        </div>
      </section>
    </div>
  );
}
