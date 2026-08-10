import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createExpenses,
  type ExpensePayload,
} from "../api/expenses";
import { getExpenseHeads, type ExpenseHead } from "../api/expenseHeads";
import DashboardLayout from "../layout/DashboardLayout";
import Icon from "../components/Icons";
import { todayISO } from "../utils/format";

interface ExpenseRow {
  key: string;
  category: string;
  expenseHeadId?: string;
  description: string;
  amount: string;
  expenseDate: string;
}

const newRow = (): ExpenseRow => ({
  key: crypto.randomUUID(),
  category: "",
  expenseHeadId: undefined,
  description: "",
  amount: "",
  expenseDate: todayISO(),
});

export default function MultiExpensePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ExpenseRow[]>([newRow()]);
  const [heads, setHeads] = useState<ExpenseHead[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;
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
  }, []);

  const updateRow = (key: string, patch: Partial<ExpenseRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const totalAmount = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const handleSubmit = async () => {
    const payloads: ExpensePayload[] = [];
    for (const row of rows) {
      const amountNum = Number(row.amount);
      if (!row.category.trim()) {
        setError("Every row needs a category or choose an expense head");
        return;
      }
      if (row.amount.trim() === "" || Number.isNaN(amountNum) || amountNum <= 0) {
        setError("Enter a valid amount for every row");
        return;
      }
      payloads.push({
        category: row.category.trim(),
        expenseHeadId: row.expenseHeadId || undefined,
        description: row.description.trim() || undefined,
        amount: amountNum,
        expenseDate: row.expenseDate || todayISO(),
      });
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const created = await createExpenses(payloads);
      setSuccess(`${created.length} expenses added (total ${totalAmount.toLocaleString("en-IN")})`);
      setRows([newRow()]);
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
          : "Failed to add expenses";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Multi Expense</h1>
          <p>Add several expenses at once</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/expenses")}
          >
            <Icon name="arrowLeft" size={16} />
            Back to Expenses
          </button>
        </div>
      </div>

      <div className="table-card">
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div
          className="price-list-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 140px 170px 40px",
            gap: 8,
            marginBottom: 8,
            fontWeight: 700,
            fontSize: 12.5,
            color: "var(--slate-500)",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}
        >
          <span>Category</span>
          <span>Description</span>
          <span>Amount</span>
          <span>Date</span>
          <span />
        </div>

        {rows.map((row) => (
          <div
            key={row.key}
            className="price-list-row"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 140px 170px 40px",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <select
              className="form-input"
              value={row.category}
              onChange={(event) => {
                const name = event.target.value;
                const head = heads.find((entry) => entry.name === name);
                updateRow(row.key, {
                  category: name,
                  expenseHeadId: head?.id,
                });
              }}
            >
              <option value="">Select category...</option>
              {heads.map((head) => (
                <option key={head.id} value={head.name}>
                  {head.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Description"
              className="form-input"
              value={row.description}
              onChange={(event) =>
                updateRow(row.key, { description: event.target.value })
              }
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="form-input"
              value={row.amount}
              onChange={(event) => updateRow(row.key, { amount: event.target.value })}
            />
            <input
              type="date"
              className="form-input"
              value={row.expenseDate}
              onChange={(event) =>
                updateRow(row.key, { expenseDate: event.target.value })
              }
            />
            <button
              type="button"
              className="icon-button icon-only icon-button-danger"
              title="Remove row"
              onClick={() =>
                setRows((current) =>
                  current.filter((entry) => entry.key !== row.key),
                )
              }
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRows((current) => [...current, newRow()])}
          >
            <Icon name="plus" size={16} />
            Add Row
          </button>
          <div style={{ flex: 1 }} />
          <span className="cell-total" style={{ marginRight: 12 }}>
            Total: {totalAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : "Save All Expenses"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
