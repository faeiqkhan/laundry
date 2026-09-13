import MasterCrudPage from "../components/MasterCrudPage";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  type Product,
  type ProductPayload,
} from "../api/products";
import { formatMoney } from "../utils/format";

const toForm = (product: Product): ProductPayload => ({
  name: product.name,
  service: product.service ?? "",
  category: product.category ?? "",
  priority: product.priority ?? 0,
  unit: product.unit ?? "",
  price: product.price,
  active: product.active,
});

const initialForm = (): ProductPayload => ({
  name: "",
  service: "",
  category: "",
  priority: 0,
  unit: "",
  price: 0,
  active: true,
});

export default function ProductsPage() {
  return (
    <MasterCrudPage<Product, ProductPayload>
      title="Products"
      subtitle={(count) => `${count} products configured`}
      icon="box"
      resource="products"
      emptyMessage="No products found"
      searchKeys={["name", "service", "category", "unit"]}
      fetchAll={getProducts}
      create={createProduct}
      update={updateProduct}
      remove={deleteProduct}
      initialForm={initialForm}
      toForm={toForm}
      validate={(form) => (!form.name?.trim() ? "Name is required" : null)}
      columns={[
        {
          key: "name",
          label: "Product",
          render: (product) => <span style={{ fontWeight: 700 }}>{product.name}</span>,
        },
        { key: "service", label: "Service", render: (product) => product.service || "—" },
        { key: "category", label: "Category", render: (product) => product.category || "—" },
        { key: "unit", label: "Unit", render: (product) => product.unit || "—" },
        {
          key: "price",
          label: "Price",
          render: (product) => <span className="cell-total">{formatMoney(product.price)}</span>,
        },
        {
          key: "active",
          label: "Status",
          render: (product) => (
            <span className={`badge ${product.active ? "badge-green" : "badge-slate"}`}>
              {product.active ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      renderFields={(form, setForm) => (
        <>
          <div className="form-field">
            <label>Product Name</label>
            <input
              type="text"
              placeholder="e.g., Achkan, Bed Sheet, Hanger"
              className="form-input"
              value={form.name ?? ""}
              onChange={(event) => setForm({ name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Service</label>
            <input
              type="text"
              placeholder="e.g., Steam Iron, Dry Cleaning"
              className="form-input"
              value={form.service ?? ""}
              onChange={(event) => setForm({ service: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Category</label>
            <input
              type="text"
              placeholder="e.g., MEN, WOMEN, HOUSEHOLD"
              className="form-input"
              value={form.category ?? ""}
              onChange={(event) => setForm({ category: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Priority</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={form.priority ?? 0}
              onChange={(event) => setForm({ priority: Number(event.target.value) })}
            />
          </div>
          <div className="form-field">
            <label>Unit</label>
            <input
              type="text"
              placeholder="e.g., Nos, Kg"
              className="form-input"
              value={form.unit ?? ""}
              onChange={(event) => setForm({ unit: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="form-input"
              value={form.price ?? ""}
              onChange={(event) => setForm({ price: Number(event.target.value) })}
            />
          </div>
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(event) => setForm({ active: event.target.checked })}
            />
            Active
          </label>
        </>
      )}
    />
  );
}