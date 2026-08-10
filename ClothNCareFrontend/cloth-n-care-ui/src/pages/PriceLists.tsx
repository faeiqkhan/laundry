import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  activatePriceList,
  deletePriceList,
  getPriceLists,
  type PriceList,
} from "../api/priceLists";
import Icon from "../components/Icons";
import DashboardLayout from "../layout/DashboardLayout";
import { formatMoney } from "../utils/format";

export default function PriceListsPage() {
  const navigate = useNavigate();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<PriceList | null>(null);

  const fetchPriceLists = async () => {
    const data = await getPriceLists();
    setPriceLists(data);
  };

  useEffect(() => {
    let ignore = false;

    getPriceLists()
      .then((data) => {
        if (!ignore) setPriceLists(data);
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
    if (!term) return priceLists;
    return priceLists.filter(
      (priceList) =>
        priceList.name.toLowerCase().includes(term) ||
        (priceList.description ?? "").toLowerCase().includes(term),
    );
  }, [priceLists, search]);

  const handleActivate = async (priceList: PriceList) => {
    if (
      !window.confirm(
        `Make "${priceList.name}" the active price list? Other lists will be deactivated.`,
      )
    ) {
      return;
    }
    try {
      await activatePriceList(priceList.id);
      await fetchPriceLists();
    } catch (error) {
      console.error(error);
      alert("Failed to activate price list");
    }
  };

  const handleDelete = async (priceList: PriceList) => {
    if (!window.confirm(`Delete price list "${priceList.name}"?`)) return;
    try {
      await deletePriceList(priceList.id);
      await fetchPriceLists();
    } catch (error) {
      console.error(error);
      alert("Failed to delete price list");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="empty-state">Loading price lists...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Price Lists</h1>
          <p>{priceLists.length} rate cards configured</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/create-price-list")}
          >
            <Icon name="plus" size={16} />
            Create Price List
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search price lists"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Items</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="table-empty">
                    <Icon name="grid" size={32} className="table-empty-icon" />
                    <div>No price lists found</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((priceList) => (
                <tr key={priceList.id}>
                  <td style={{ fontWeight: 700 }}>{priceList.name}</td>
                  <td className="cell-muted">{priceList.description || "—"}</td>
                  <td>{priceList.entries.length}</td>
                  <td>
                    <span
                      className={`badge ${priceList.active ? "badge-green" : "badge-slate"}`}
                    >
                      {priceList.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="cell-muted">
                    {new Date(priceList.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-only"
                        title="View"
                        onClick={() => setViewing(priceList)}
                      >
                        <Icon name="eye" size={16} />
                      </button>
                      {!priceList.active && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleActivate(priceList)}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-button icon-only icon-button-danger"
                        title="Delete"
                        onClick={() => handleDelete(priceList)}
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

      {viewing && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal"
            aria-labelledby="view-price-list-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2 id="view-price-list-title">{viewing.name}</h2>
                <p>
                  {viewing.description || "No description"} ·{" "}
                  {viewing.entries.length} items
                </p>
              </div>
              <button
                type="button"
                className="icon-button icon-only"
                onClick={() => setViewing(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.entries.map((entry, index) => (
                    <tr key={`${entry.itemType}-${entry.itemName}-${index}`}>
                      <td className="cell-muted">
                        {entry.itemType === "SERVICE" ? "Service" : "Product"}
                      </td>
                      <td>{entry.itemName}</td>
                      <td className="cell-total">{formatMoney(entry.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
