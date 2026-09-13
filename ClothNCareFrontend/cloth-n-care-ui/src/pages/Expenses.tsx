import { useEffect, useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  type Expense,
  type ExpensePayload,
} from "../api/expenses";
import { getExpenseHeads, type ExpenseHead } from "../api/expenseHeads";
import DashboardLayout from "../layout/DashboardLayout";
import ImportExportButtons from "../components/ImportExportButtons";
import Icon from "../components/Icons";
import { formatDate, formatMoney, todayISO } from "../utils/format";

const CATEGORIES = [
  "Supplies",
  "Detergents",
  "Utilities",
  "Rent",
  "Equipment",
  "Packaging",
  "Transport",
  "Other",
];

function AddExpenseModal({
  heads,
  onClose,
  onSuccess,
}: {
  heads: ExpenseHead[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ExpensePayload>(() => ({
    category: heads.length > 0 ? heads[0].name : CATEGORIES[0],
    expenseHeadId: heads.length > 0 ? heads[0].id : undefined,
    description: "",
    amount: 0,
    expenseDate: todayISO(),
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const options = heads.length > 0 ? heads.map((head) => head.name) : CATEGORIES;

  const handleSubmit = async () => {
    if (!form.category) {
      setError("Please choose a category");
      return;
    }
    if (!form.amount || form.amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await createExpense({
        category: form.category,
        expenseHeadId: form.expenseHeadId,
        description: form.description?.trim() || undefined,
        amount: form.amount,
        expenseDate: form.expenseDate,
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
          : "Failed to add expense";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        aria-labelledby="add-expense-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 id="add-expense-title">Add Expense</h2>
            <p>Record an expense</p>
          </div>
          <button type="button" className="icon-button icon-only" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-field">
            <label>Category</label>
            <select
              className="form-input"
              value={form.category}
              onChange={(event) => {
                const name = event.target.value;
                const head = heads.find((entry) => entry.name === name);
                setForm({
                  ...form,
                  category: name,
                  expenseHeadId: head?.id,
                });
              }}
            >
              {options.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Description (optional)</label>
            <input
              className="form-input"
              placeholder="e.g., Washing powder, electricity bill"
              value={form.description ?? ""}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: Number(event.target.value) })
                }
              />
            </div>

            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                className="form-input"
                value={form.expenseDate}
                onChange={(event) =>
                  setForm({ ...form, expenseDate: event.target.value })
                }
              />
            </div>
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
            {loading ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [heads, setHeads] = useState<ExpenseHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30");

  const { from, to } = useMemo(() => {
    const toDate = new Date();
    const toIso = toDate.toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Number(range));
    return { from: fromDate.toISOString().slice(0, 10), to: toIso };
  }, [range]);

  const fetchExpenses = async () => {
    setError("");
    const data = await getExpenses(from, to);
    setExpenses(data);
  };

  useEffect(() => {
    let ignore = false;

    getExpenses(from, to)
      .then((data) => {
        if (!ignore) setExpenses(data);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) setError("Failed to load expenses");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    getExpenseHeads()
      .then((data) => {
        if (!ignore) setHeads(data);
      })
      .catch(() => {
        /* heads are optional */
      });

    return () => {
      ignore = true;
    };
  }, [from, to]);

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Delete this ${formatMoney(expense.amount)} expense?`)) {
      return;
    }

    try {
      await deleteExpense(expense.id);
      setExpenses((current) =>
        current.filter((entry) => entry.id !== expense.id),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete expense");
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Expenses</h1>
          <p>{expenses.length} expenses recorded</p>
        </div>

        <div className="page-header-actions">
          <ImportExportButtons
            resource="expenses"
            onImported={() => fetchExpenses().catch((err) => console.error(err))}
          />
          <select
            className="filter-select"
            value={range}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setRange(event.target.value);
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Icon name="plus" size={16} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-danger">
          <div className="stat-label">Total This Period</div>
          <div className="stat-value">{formatMoney(total)}</div>
          <div className="stat-footer">{expenses.length} entries</div>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Date</th>
              <th>Added By</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="table-empty">Loading...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6}>
                  <div className="table-empty">{error}</div>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="table-empty">
                    <Icon name="receipt" size={32} className="table-empty-icon" />
                    <div>No expenses in this period</div>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <span className="badge badge-slate">{expense.category}</span>
                  </td>
                  <td className="cell-muted">{expense.description || "-"}</td>
                  <td className="cell-muted">{formatDate(expense.expenseDate)}</td>
                  <td className="cell-muted">{expense.createdByName || "-"}</td>
                  <td className="cell-total">{formatMoney(expense.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-button icon-only icon-button-danger"
                      title="Delete"
                      onClick={() => handleDelete(expense)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddExpenseModal
          heads={heads}
          onClose={() => setShowModal(false)}
          onSuccess={() => fetchExpenses().catch((err) => console.error(err))}
        />
      )}
    </DashboardLayout>
  );
}
