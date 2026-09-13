import MasterCrudPage from "../components/MasterCrudPage";
import {
  createBag,
  deleteBag,
  getBags,
  updateBag,
  type BagStatus,
  type StorageBag,
  type StorageBagPayload,
} from "../api/bags";

const BAG_BADGE: Record<BagStatus, string> = {
  AVAILABLE: "badge-green",
  ASSIGNED: "badge-blue",
  RETURNED: "badge-slate",
};

const BAG_LABEL: Record<BagStatus, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  RETURNED: "Returned",
};

const toForm = (bag: StorageBag): StorageBagPayload => ({
  bagNumber: bag.bagNumber,
  size: bag.size ?? "",
  status: bag.status,
  notes: bag.notes ?? "",
});

const initialForm = (): StorageBagPayload => ({
  bagNumber: "",
  size: "",
  status: "AVAILABLE",
  notes: "",
});

export default function StorageBagsPage() {
  return (
    <MasterCrudPage<StorageBag, StorageBagPayload>
      title="Storage Bags"
      subtitle={(count) => `${count} bags configured`}
      icon="bag"
      resource="bags"
      emptyMessage="No storage bags found"
      searchKeys={["bagNumber", "size", "notes"]}
      fetchAll={getBags}
      create={createBag}
      update={updateBag}
      remove={deleteBag}
      initialForm={initialForm}
      toForm={toForm}
      validate={(form) => (!form.bagNumber?.trim() ? "Bag number is required" : null)}
      columns={[
        {
          key: "bagNumber",
          label: "Bag No.",
          render: (bag) => <span style={{ fontWeight: 700 }}>{bag.bagNumber}</span>,
        },
        { key: "size", label: "Size", render: (bag) => bag.size || "—" },
        {
          key: "status",
          label: "Status",
          render: (bag) => (
            <span className={`badge ${BAG_BADGE[bag.status]}`}>{BAG_LABEL[bag.status]}</span>
          ),
        },
        { key: "notes", label: "Notes", render: (bag) => bag.notes || "—" },
      ]}
      renderFields={(form, setForm) => (
        <>
          <div className="form-field">
            <label>Bag Number</label>
            <input
              type="text"
              placeholder="e.g., BAG-001"
              className="form-input"
              value={form.bagNumber ?? ""}
              onChange={(event) => setForm({ bagNumber: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Size</label>
            <input
              type="text"
              placeholder="e.g., Small, Medium, Large"
              className="form-input"
              value={form.size ?? ""}
              onChange={(event) => setForm({ size: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select
              className="form-input"
              value={form.status ?? "AVAILABLE"}
              onChange={(event) => setForm({ status: event.target.value as BagStatus })}
            >
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
          <div className="form-field">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Optional"
              className="form-input"
              value={form.notes ?? ""}
              onChange={(event) => setForm({ notes: event.target.value })}
            />
          </div>
        </>
      )}
    />
  );
}
