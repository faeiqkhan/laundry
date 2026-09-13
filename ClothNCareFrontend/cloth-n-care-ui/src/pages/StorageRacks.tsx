import MasterCrudPage from "../components/MasterCrudPage";
import {
  createRack,
  deleteRack,
  getRacks,
  updateRack,
  type StorageRack,
  type StorageRackPayload,
} from "../api/racks";

const toForm = (rack: StorageRack): StorageRackPayload => ({
  name: rack.name,
  location: rack.location ?? "",
  capacity: rack.capacity,
  notes: rack.notes ?? "",
});

const initialForm = (): StorageRackPayload => ({
  name: "",
  location: "",
  capacity: 0,
  notes: "",
});

export default function StorageRacksPage() {
  return (
    <MasterCrudPage<StorageRack, StorageRackPayload>
      title="Storage Racks"
      subtitle={(count) => `${count} racks configured`}
      icon="shelves"
      resource="racks"
      emptyMessage="No storage racks found"
      searchKeys={["name", "location", "notes"]}
      fetchAll={getRacks}
      create={createRack}
      update={updateRack}
      remove={deleteRack}
      initialForm={initialForm}
      toForm={toForm}
      validate={(form) => (!form.name?.trim() ? "Rack name is required" : null)}
      columns={[
        {
          key: "name",
          label: "Rack",
          render: (rack) => <span style={{ fontWeight: 700 }}>{rack.name}</span>,
        },
        { key: "location", label: "Location", render: (rack) => rack.location || "—" },
        {
          key: "capacity",
          label: "Capacity",
          render: (rack) => (rack.capacity > 0 ? rack.capacity : "—"),
        },
        { key: "notes", label: "Notes", render: (rack) => rack.notes || "—" },
      ]}
      renderFields={(form, setForm) => (
        <>
          <div className="form-field">
            <label>Rack Name</label>
            <input
              type="text"
              placeholder="e.g., Rack A-1"
              className="form-input"
              value={form.name ?? ""}
              onChange={(event) => setForm({ name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Location</label>
            <input
              type="text"
              placeholder="e.g., Back store, Front area"
              className="form-input"
              value={form.location ?? ""}
              onChange={(event) => setForm({ location: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Capacity</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={form.capacity ?? ""}
              onChange={(event) => setForm({ capacity: Number(event.target.value) })}
            />
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
