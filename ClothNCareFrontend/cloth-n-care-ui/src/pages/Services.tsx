import { useEffect, useState } from "react";
import { deleteService, getServices, type Service } from "../api/services";
import DashboardLayout from "../layout/DashboardLayout";
import CreateServiceModal from "../components/CreateServiceModal";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    let ignore = false;

    getServices()
      .then((data) => {
        if (!ignore) {
          setServices(data);
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleServiceCreated = () => {
    getServices()
      .then((data) => {
        setServices(data);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleDeleteService = async (service: Service) => {
    const confirmed = window.confirm(
      `Delete ${service.name} - ${service.productType}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteService(service.id);
      handleServiceCreated();
    } catch (error) {
      console.error(error);
      alert("Failed to delete service");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div>Loading services...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <button
          type="button"
          className="primary-button"
          onClick={() => setShowCreateModal(true)}
        >
          + Add Service
        </button>
      </div>

      <div className="table-card premium-table-card">
        <table className="orders-table">
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
            {services.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <span className="action-muted">No services found</span>
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id}>
                  <td data-label="Service">{service.name}</td>
                  <td data-label="Product Type">{service.productType}</td>
                  <td data-label="Price">{"\u20b9"}{service.price}</td>
                  <td data-label="Status">
                    <span
                      className={
                        service.active
                          ? "status-badge status-ready"
                          : "status-badge status-default"
                      }
                    >
                      {service.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="order-inline-actions">
                      <button
                        type="button"
                        className="icon-text-button action-blue"
                        onClick={() => setEditingService(service)}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="icon-text-button action-red"
                        onClick={() => handleDeleteService(service)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateServiceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleServiceCreated}
        />
      )}

      {editingService && (
        <CreateServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={handleServiceCreated}
        />
      )}
    </DashboardLayout>
  );
}
