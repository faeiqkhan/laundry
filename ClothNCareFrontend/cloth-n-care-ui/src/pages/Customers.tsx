import { useEffect, useState } from "react";
import { getCustomers, type Customer } from "../api/customers";
import CreateCustomerModal from "../components/CreateCustomerModal";
import DashboardLayout from "../layout/DashboardLayout";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data);
  };

  useEffect(() => {
    let ignore = false;

    getCustomers()
      .then((data) => {
        if (!ignore) {
          setCustomers(data);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div>Loading customers...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <button
          type="button"
          className="primary-button"
          onClick={() => setShowCreateModal(true)}
        >
          + Add Customer
        </button>
      </div>

      <div className="table-card premium-table-card">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <span className="action-muted">No customers found</span>
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td data-label="Name">{customer.name}</td>
                  <td data-label="Phone">{customer.phone}</td>
                  <td data-label="Email">{customer.email || "-"}</td>
                  <td data-label="Created At">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchCustomers().catch((error) => console.error(error));
          }}
        />
      )}
    </DashboardLayout>
  );
}
