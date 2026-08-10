import { useState } from "react";
import {
  createCustomer,
  type Customer,
  type CustomerPayload,
} from "../api/customers";
import Icon from "./Icons";

interface Props {
  initialName?: string;
  initialPhone?: string;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export default function CreateCustomerModal({
  initialName = "",
  initialPhone = "",
  onClose,
  onSuccess,
}: Props) {
  const [customer, setCustomer] = useState<CustomerPayload>({
    name: initialName,
    phone: initialPhone,
    email: "",
    address: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const name = customer.name.trim();
    const phone = customer.phone.trim();

    if (!name || !phone) {
      setError("Please enter customer name and phone");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const created = await createCustomer({
        name,
        phone,
        email: customer.email?.trim() || undefined,
        address: customer.address?.trim() || undefined,
        notes: customer.notes?.trim() || undefined,
      });

      onSuccess(created);
      onClose();
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
          : "Failed to create customer";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        aria-labelledby="create-customer-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 id="create-customer-title">Add Customer</h2>
            <p>Customer contact details and notes</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-field">
            <label htmlFor="customer-name">Name</label>
            <input
              id="customer-name"
              className="form-input"
              value={customer.name}
              onChange={(event) =>
                setCustomer((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="customer-phone">Phone</label>
              <input
                id="customer-phone"
                className="form-input"
                value={customer.phone}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="customer-email">Email (optional)</label>
              <input
                id="customer-email"
                type="email"
                className="form-input"
                value={customer.email ?? ""}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="customer-address">Address (optional)</label>
            <input
              id="customer-address"
              className="form-input"
              value={customer.address ?? ""}
              onChange={(event) =>
                setCustomer((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="customer-notes">Notes (optional)</label>
            <textarea
              id="customer-notes"
              className="form-textarea"
              rows={3}
              value={customer.notes ?? ""}
              onChange={(event) =>
                setCustomer((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
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
            {loading ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </section>
    </div>
  );
}
