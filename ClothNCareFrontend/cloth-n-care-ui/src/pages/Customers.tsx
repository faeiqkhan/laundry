import { useEffect, useState } from "react";
import {
  getCustomerPage,
  getCustomerById,
  updateCustomer,
  type Customer,
  type CustomerDetail,
  type CustomerPayload,
} from "../api/customers";
import CreateCustomerModal from "../components/CreateCustomerModal";
import CustomerDetailDrawer from "../components/CustomerDetailDrawer";
import ImportExportButtons from "../components/ImportExportButtons";
import Pagination from "../components/Pagination";
import Icon from "../components/Icons";
import DashboardLayout from "../layout/DashboardLayout";
import { formatDate } from "../utils/format";

function EditCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CustomerPayload>({
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await updateCustomer(customer.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });
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
          : "Failed to update customer";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        aria-labelledby="edit-customer-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 id="edit-customer-title">Edit Customer</h2>
            <p>{customer.name}</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-field">
            <label>Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Email (optional)</label>
              <input
                type="email"
                className="form-input"
                value={form.email ?? ""}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Address (optional)</label>
            <input
              className="form-input"
              value={form.address ?? ""}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>

          <div className="form-field">
            <label>Notes (optional)</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.notes ?? ""}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    getCustomerPage({
      page,
      q: debouncedSearch || undefined,
    })
      .then((data) => {
        if (ignore) return;
        setRows(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, reloadKey, debouncedSearch]);

  const openDrawer = async (customer: Customer) => {
    setDrawerLoading(true);
    setSelected({
      ...customer,
      orderCount: 0,
      totalSpent: 0,
      orders: [],
    });
    try {
      const detail = await getCustomerById(customer.id);
      setSelected(detail);
    } catch (err) {
      console.error(err);
      alert("Failed to load customer history");
    } finally {
      setDrawerLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading customers...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Customers</h1>
          <p>{totalElements} registered customers</p>
        </div>

        <div className="page-header-actions">
          <ImportExportButtons
            resource="customers"
            onImported={reload}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Icon name="plus" size={16} />
            Add Customer
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Member Since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="table-empty">
                    <Icon name="customers" size={32} className="table-empty-icon" />
                    <div>No customers found</div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{customer.name}</div>
                  </td>
                  <td>{customer.phone}</td>
                  <td className="cell-muted">{customer.email || "-"}</td>
                  <td className="cell-muted">{customer.address || "-"}</td>
                  <td className="cell-muted">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="View history"
                        onClick={() => openDrawer(customer)}
                      >
                        <Icon name="eye" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="Edit"
                        onClick={() => setEditing(customer)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={10}
          onPageChange={setPage}
        />
      </div>

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            reload();
          }}
        />
      )}

      {editing && (
        <EditCustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSuccess={reload}
        />
      )}

      {selected && (
        <CustomerDetailDrawer
          customer={selected}
          loading={drawerLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </DashboardLayout>
  );
}