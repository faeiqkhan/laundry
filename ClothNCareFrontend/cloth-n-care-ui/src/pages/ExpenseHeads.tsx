import MasterCrudPage from "../components/MasterCrudPage";
import {
  createExpenseHead,
  deleteExpenseHead,
  getExpenseHeads,
  updateExpenseHead,
  type ExpenseHead,
  type ExpenseHeadPayload,
} from "../api/expenseHeads";

const toForm = (head: ExpenseHead): ExpenseHeadPayload => ({
  name: head.name,
  description: head.description ?? "",
  active: head.active,
});

const initialForm = (): ExpenseHeadPayload => ({
  name: "",
  description: "",
  active: true,
});

export default function ExpenseHeadsPage() {
  return (
    <MasterCrudPage<ExpenseHead, ExpenseHeadPayload>
      title="Expense Heads"
      subtitle={(count) => `${count} expense heads configured`}
      icon="folder"
      resource="expense-heads"
      emptyMessage="No expense heads found"
      searchKeys={["name", "description"]}
      fetchAll={getExpenseHeads}
      create={createExpenseHead}
      update={updateExpenseHead}
      remove={deleteExpenseHead}
      initialForm={initialForm}
      toForm={toForm}
      validate={(form) => (!form.name?.trim() ? "Name is required" : null)}
      columns={[
        {
          key: "name",
          label: "Expense Head",
          render: (head) => <span style={{ fontWeight: 700 }}>{head.name}</span>,
        },
        { key: "description", label: "Description", render: (head) => head.description || "—" },
        {
          key: "active",
          label: "Status",
          render: (head) => (
            <span className={`badge ${head.active ? "badge-green" : "badge-slate"}`}>
              {head.active ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      renderFields={(form, setForm) => (
        <>
          <div className="form-field">
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g., Rent, Electricity, Salary"
              className="form-input"
              value={form.name ?? ""}
              onChange={(event) => setForm({ name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Description</label>
            <input
              type="text"
              placeholder="Optional"
              className="form-input"
              value={form.description ?? ""}
              onChange={(event) => setForm({ description: event.target.value })}
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
