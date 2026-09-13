import { useEffect, useMemo, useState } from "react";
import {
  getServices,
  deleteService,
  type Service,
} from "../api/services";
import CreateServiceModal from "../components/CreateServiceModal";
import ImportExportButtons from "../components/ImportExportButtons";
import Icon from "../components/Icons";
import DashboardLayout from "../layout/DashboardLayout";
import { formatMoney } from "../utils/format";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [search, setSearch] = useState("");

  const fetchServices = async () => {
    const data = await getServices();
    setServices(data);
  };

  useEffect(() => {
    let ignore = false;

    getServices()
      .then((data) => {
        if (!ignore) setServices(data);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(term) ||
        service.productType.toLowerCase().includes(term),
    );
  }, [services, search]);

  const handleDelete = async (service: Service) => {
    const confirmed = window.confirm(
      `Delete service "${service.name}"? Orders using it will keep their recorded price.`,
    );
    if (!confirmed) return;

    try {
      await deleteService(service.id);
      await fetchServices();
    } catch (error) {
      console.error(error);
      alert("Failed to delete service");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading services...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Services & Pricing</h1>
          <p>{services.length} services configured</p>
        </div>

        <div className="page-header-actions">
          <ImportExportButtons
            resource="services"
            onImported={() => fetchServices().catch((error) => console.error(error))}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Icon name="plus" size={16} />
            Add Service
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search services"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Product Type</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="table-empty">
                    <Icon name="services" size={32} className="table-empty-icon" />
                    <div>No services found</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((service) => (
                <tr key={service.id}>
                  <td style={{ fontWeight: 700 }}>{service.name}</td>
                  <td className="cell-muted">{service.productType}</td>
                  <td className="cell-total">{formatMoney(service.price)}</td>
                  <td>
                    <span
                      className={`badge ${service.active ? "badge-green" : "badge-slate"}`}
                    >
                      {service.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="Edit"
                        onClick={() => setEditing(service)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-only icon-button-danger"
                        title="Delete"
                        onClick={() => handleDelete(service)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateServiceModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchServices}
        />
      )}

      {editing && (
        <CreateServiceModal
          service={editing}
          onClose={() => setEditing(null)}
          onSuccess={fetchServices}
        />
      )}
    </DashboardLayout>
  );
}
