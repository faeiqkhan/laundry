import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, type Product } from "../api/products";
import { getServices, type Service } from "../api/services";
import {
  createPriceList,
  type PriceListEntry,
  type PriceListEntryType,
} from "../api/priceLists";
import Icon from "../components/Icons";
import DashboardLayout from "../layout/DashboardLayout";
import { uid } from "../utils/format";

interface EntryRow {
  key: string;
  itemType: PriceListEntryType;
  itemName: string;
  price: string;
}

const newEntry = (): EntryRow => ({
  key: uid(),
  itemType: "SERVICE",
  itemName: "",
  price: "",
});

export default function CreatePriceListPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([newEntry()]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([getServices(), getProducts()])
      .then(([serviceList, productList]) => {
        if (!ignore) {
          setServices(serviceList);
          setProducts(productList);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load services and products");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const optionsFor = (itemType: PriceListEntryType) =>
    itemType === "SERVICE" ? services : products;

  const updateRow = (key: string, patch: Partial<EntryRow>) => {
    setEntries((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Price list name is required");
      return;
    }

    const validEntries: PriceListEntry[] = [];
    for (const row of entries) {
      if (!row.itemName.trim()) {
        setError("Choose an item for every row or remove empty rows");
        return;
      }
      const priceNum = Number(row.price);
      if (row.price.trim() === "" || Number.isNaN(priceNum) || priceNum < 0) {
        setError("Enter a valid price for every item");
        return;
      }
      validEntries.push({
        itemType: row.itemType,
        itemName: row.itemName.trim(),
        price: priceNum,
      });
    }

    if (validEntries.length === 0) {
      setError("Add at least one item to the price list");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createPriceList({ name: name.trim(), description: description.trim(), entries: validEntries });
      navigate("/price-lists");
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
          : "Failed to create price list";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Create Price List</h1>
          <p>Build a rate card from your services and products</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/price-lists")}
          >
            <Icon name="arrowLeft" size={16} />
            Back to Price Lists
          </button>
        </div>
      </div>

      <div className="table-card">
        {error && <div className="form-error">{error}</div>}

        <div className="form-grid" style={{ padding: "16px 16px 0" }}>
          <div className="form-field">
            <label htmlFor="pl-name">Price List Name</label>
            <input
              id="pl-name"
              type="text"
              placeholder="e.g., Standard Rates 2026"
              className="form-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pl-desc">Description</label>
            <input
              id="pl-desc"
              type="text"
              placeholder="Optional note"
              className="form-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label>Items</label>
            {entries.map((row) => (
              <div
                key={row.key}
                className="price-list-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 120px 40px",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <select
                  className="form-input"
                  value={row.itemType}
                  onChange={(event) =>
                    updateRow(row.key, {
                      itemType: event.target.value as PriceListEntryType,
                      itemName: "",
                    })
                  }
                >
                  <option value="SERVICE">Service</option>
                  <option value="PRODUCT">Product</option>
                </select>
                <select
                  className="form-input"
                  value={row.itemName}
                  onChange={(event) =>
                    updateRow(row.key, { itemName: event.target.value })
                  }
                >
                  <option value="">Select {row.itemType.toLowerCase()}...</option>
                  {optionsFor(row.itemType).map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  className="form-input"
                  value={row.price}
                  onChange={(event) =>
                    updateRow(row.key, { price: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="icon-button icon-only icon-button-danger"
                  title="Remove item"
                  onClick={() =>
                    setEntries((current) =>
                      current.filter((entry) => entry.key !== row.key),
                    )
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEntries((current) => [...current, newEntry()])}
            >
              <Icon name="plus" size={16} />
              Add Item
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={() => navigate("/price-lists")}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading}
            className="btn btn-primary"
          >
            {saving ? "Creating..." : "Create Price List"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
