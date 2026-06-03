import { useState } from "react";
import {
  createService,
  updateService,
  type CreateServicePayload,
  type Service,
} from "../api/services";

interface Props {
  service?: Service;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateServiceModal({
  service,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState(service?.name ?? "");
  const [productType, setProductType] = useState(service?.productType ?? "");
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [active, setActive] = useState(service?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(service);

  const handleSubmit = async () => {
    if (!name.trim() || !productType.trim() || !price) {
      setError("Please fill in all fields");
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload: CreateServicePayload = {
        name: name.trim(),
        productType: productType.trim(),
        price: priceNum,
        active,
      };

      if (service) {
        await updateService(service.id, payload);
      } else {
        await createService(payload);
      }

      onSuccess();
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
          : isEditing
            ? "Failed to update service"
            : "Failed to create service";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="create-order-modal"
        aria-labelledby="create-service-title"
        role="dialog"
        aria-modal="true"
      >
        <h2 id="create-service-title">
          {isEditing ? "Update Service" : "Create Service"}
        </h2>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-field">
          <label htmlFor="service-name">Service Name</label>
          <input
            id="service-name"
            type="text"
            placeholder="e.g., Wash & Fold"
            className="modal-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="product-type">Product Type</label>
          <input
            id="product-type"
            type="text"
            placeholder="e.g., Clothes, Bedsheet, Blanket"
            className="modal-input"
            value={productType}
            onChange={(event) => setProductType(event.target.value)}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="price">Price</label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="modal-input"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>

        <label className="modal-check">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>

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
            {loading
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Service"}
          </button>
        </div>
      </section>
    </div>
  );
}
