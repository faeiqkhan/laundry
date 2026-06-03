import { useState } from "react";
import {
  createCustomer,
  type CreateCustomerPayload,
  type Customer,
} from "../api/customers";

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
  const [customer, setCustomer] = useState<CreateCustomerPayload>({
    name: initialName,
    phone: initialPhone,
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const name = customer.name.trim();
    const phone = customer.phone.trim();
    const email = customer.email?.trim();

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
        email: email || undefined,
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
        className="create-order-modal"
        aria-labelledby="create-customer-title"
        role="dialog"
        aria-modal="true"
      >
        <h2 id="create-customer-title">Add Customer</h2>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="customer-name">Name</label>
          <input
            id="customer-name"
            className="modal-input"
            value={customer.name}
            onChange={(event) =>
              setCustomer((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </div>

        <div className="modal-field">
          <label htmlFor="customer-phone">Phone</label>
          <input
            id="customer-phone"
            className="modal-input"
            value={customer.phone}
            onChange={(event) =>
              setCustomer((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
          />
        </div>

        <div className="modal-field">
          <label htmlFor="customer-email">Email</label>
          <input
            id="customer-email"
            type="email"
            className="modal-input"
            value={customer.email ?? ""}
            onChange={(event) =>
              setCustomer((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </div>

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
            {loading ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </section>
    </div>
  );
}
